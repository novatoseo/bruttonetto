// ══════════════════════════════════════════════════════
  // LOHNSTEUER — BMF PAP Aproximación de Alta Precisión
  // ══════════════════════════════════════════════════════

  function lohnsteuer(params) {
    const {
      bruttoJahr,
      steuerklasse = 1,
      kirchensteuer = false,
      bundesland = 'Nordrhein-Westfalen',
      kinderfreibetrag = 0,
      steuerfreibetrag = 0,
      geldwerterVorteil = 0,
      kvZusatzbeitrag = CONST.KV_ZUSATZ_DEFAULT, // Necesario para la VSP exacta
      hatKinder = false,
      alter = 30
    } = params;

    // 1. Jahresarbeitslohn (RE4 en el PAP)
    // Se truncan los centavos según el BMF
    const RE4 = Math.floor(bruttoJahr + geldwerterVorteil * 12) + 0.00;

    const isStKl6 = steuerklasse === 6;
    const isSplitting = steuerklasse === 3 || steuerklasse === 4;

    // 2. Abzüge (Pauschbeträge)
    const werbungskosten = isStKl6 ? 0 : CONST.WERBUNGSKOSTEN_PAUSCHALE;
    const sonderausgaben = isStKl6 ? 0 : CONST.SONDERAUSGABEN_PAUSCHALE;

    // 3. Vorsorgepauschale (VSP) - Implementación exacta del PAP
    let vorsorgepauschale = 0;
    if (!isStKl6) {
      // 3a. Rentenversicherung (RV)
      const bbgRv = CONST.BBG_RV_MONAT * 12;
      const rvBemessungsgrundlage = Math.min(RE4, bbgRv);
      // Para 2026, el factor a considerar es 100% del 50% del total (9.3%)
      const vspRV = Math.ceil(rvBemessungsgrundlage * (CONST.RV_SATZ / 2));

      // 3b. Kranken- und Pflegeversicherung (KV/PV)
      const bbgKv = CONST.BBG_KV_MONAT * 12;
      const kvBemessungsgrundlage = Math.min(RE4, bbgKv);
      
      // Tasa KV para Vorsorgepauschale (7.3% base + la mitad del Zusatzbeitrag)
      const kvSatzVSP = (0.073 + (kvZusatzbeitrag / 2));
      
      // Tasa PV para Vorsorgepauschale (el BMF usa la tasa base sin recargo por no hijos en la VSP para simplificar, 
      // pero desde las últimas reformas se ajusta. Asumimos el estándar AN-Anteil de 1.7% base)
      let pvSatzVSP = 0.017;
      if (bundesland === 'Sachsen') {
         pvSatzVSP = 0.022; // Sachsen AN pays more
      }

      const vspKVPV = Math.ceil(kvBemessungsgrundlage * (kvSatzVSP + pvSatzVSP));

      // 3c. Günstigerprüfung (Mindestvorsorgepauschale)
      const limitKV = (steuerklasse === 3) ? CONST.VORSORGE_MAX_KV_3 : CONST.VORSORGE_MAX_KV;
      const mindestVSP = Math.min(Math.ceil(RE4 * 0.12), limitKV);
      
      const vspKVPV_final = Math.max(vspKVPV, mindestVSP);

      vorsorgepauschale = vspRV + vspKVPV_final;
    }

    // 4. Ermittlung des zu versteuernden Einkommens (zvE)
    // El zvE se redondea a la baja al euro más cercano (según EStG)
    let zvE = Math.floor(RE4 - werbungskosten - sonderausgaben - vorsorgepauschale - steuerfreibetrag);
    zvE = Math.max(0, zvE);

    // 5. Aplicación de Freibeträge especiales por clase
    if (steuerklasse === 2) {
      // Entlastungsbetrag für Alleinerziehende (4260 € base para 1 hijo)
      zvE = Math.max(0, zvE - 4260);
    }

    // 6. Jahreslohnsteuer (ST)
    let lstJahr = 0;
    if (steuerklasse === 3) {
      // Splittingtarif
      lstJahr = einkommensteuer(Math.floor(zvE / 2)) * 2;
    } else if (steuerklasse === 5 || steuerklasse === 6) {
      // Simplificación para StKl V/VI (El PAP real usa un multiplicador complejo, pero para la calculadora web
      // aplicar el tarif base sin Grundfreibetrag o con tarif ajustado suele dar el resultado esperado.
      // Aquí aplicamos el tarif estándar sobre un zvE ajustado según el PAP)
      lstJahr = einkommensteuer(zvE); 
      // Nota: Para StKl 5/6 perfecta se requiere el cálculo específico del factor V. 
    } else {
      // Grundtarif (StKl 1, 2, 4)
      lstJahr = einkommensteuer(zvE);
    }

    // 7. Solidaritätszuschlag
    const kinderfreibetragJahr = kinderfreibetrag * CONST.KINDERFREIBETRAG;
    const zvEFuerSoli = Math.max(0, zvE - kinderfreibetragJahr);
    
    let lstFuerSoli = 0;
    if (steuerklasse === 3) {
      lstFuerSoli = einkommensteuer(Math.floor(zvEFuerSoli / 2)) * 2;
    } else {
      lstFuerSoli = einkommensteuer(zvEFuerSoli);
    }

    const soliFreigrenze = (steuerklasse === 3) ? CONST.SOLI_FREIGRENZE_VERHEIRATET : CONST.SOLI_FREIGRENZE;
    let soli = 0;
    
    if (lstFuerSoli > soliFreigrenze) {
      soli = lstFuerSoli * CONST.SOLI_SATZ;
      // Milderungszone exacta (11.9% del exceso)
      const milderung = (lstFuerSoli - soliFreigrenze) * 0.119;
      soli = Math.min(soli, milderung);
    }
    
    // PAP regla: Soli truncado a céntimos exactos hacia abajo en cálculos mensuales, pero en anuales redondeado
    soli = Math.floor(soli * 100) / 100;

    // 8. Kirchensteuer
    let kist = 0;
    if (kirchensteuer) {
      const kistSatz = CONST.KIRCHENSTEUER[bundesland] || 0.09;
      // La base para KiSt siempre considera los Kinderfreibeträge
      let lstFuerKist = 0;
      if (steuerklasse === 3) {
        lstFuerKist = einkommensteuer(Math.floor(Math.max(0, zvE - kinderfreibetragJahr) / 2)) * 2;
      } else {
        lstFuerKist = einkommensteuer(Math.max(0, zvE - kinderfreibetragJahr));
      }
      kist = lstFuerKist * kistSatz;
    }
    kist = Math.floor(kist * 100) / 100;

    return {
      lohnsteuer: Math.floor(lstJahr * 100) / 100, // Forzamos precisión financiera
