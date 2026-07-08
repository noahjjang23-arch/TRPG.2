import { bindToastFeedback, handleDelegatedChange, handlePlayerDelegatedClick, openPartialResetModal } from "./core_ui.js";
import { addShopGoods, addTurn, addUpgradeRule, advanceWorldEvents, applyRuntimeSkill, bindAdvancedSystems, bindCreationSystem, bindMasterCategoryTabs, clearMasterPassword, confirmMasterLogin, endCombat, enterPlayerMode, fillShopGoodsSelect, nextTurn, openShop, openUpgrade, renderRuntimeSkillSelect, requestMasterAccess, rollD20, rollEncounter, runSkillCheck, saveMasterPassword, screenEffect, showToast, standalonePlayerRoll } from "./combat.js";
import { exportData, importData, renderForgeConfigForm, renderLog, saveForgeConfig, updateHudBar } from "./creation.js";
import { addBoss, addEnchant, addEquipment, addFumble, addItem, addMaterial, addNpc, addPlayer, addTempBossFumble, fillNpcJobConfigForm, loadActiveBoss, loadActiveNpc, renderActiveBosses, renderActiveNpcs, saveNpcJobConfig } from "./crud.js";
import {appState, $,  data, defaultData } from "./constants_data.js";
import { addCondition, addMap, addSkill, addTempMapEffect, loadMap, readImage, renderAll, setMode, setupSceneDragDrop } from "./rendering.js";
import { save } from "./main.js";

export function bindEvents() {
  const clicks = {
    "enterMasterBtn": () => requestMasterAccess(),
    "enterPlayerBtn": () => enterPlayerMode(),
    "goModeFromMasterBtn": () => setMode("mode"),
    "goModeFromGameBtn": () => setMode("mode"),
    "startGameBtn": () => setMode("game"),
    "backMasterBtn": () => setMode("master"),
    "playerBackModeBtn": () => setMode("mode"),
    "saveMasterPasswordBtn": saveMasterPassword,
    "clearMasterPasswordBtn": clearMasterPassword,
    "closeMasterLoginBtn": () => $("masterLoginModal")?.classList.add("hidden"),
    "confirmMasterLoginBtn": confirmMasterLogin,
    "standalonePlayerRollBtn": standalonePlayerRoll,
    "resetAllBtn": resetAllData,
    "exportBtn": exportData,
    "addMapEffectBtn": addTempMapEffect,
    "addMapBtn": addMap,
    "loadMapBtn": loadMap,
    "addConditionBtn": addCondition,
    "addSkillBtn": addSkill,
    "addPlayerBtn": addPlayer,
    "addNpcBtn": addNpc,
    "saveNpcJobConfigBtn": saveNpcJobConfig,
    "addBossFumbleBtn": addTempBossFumble,
    "addBossBtn": addBoss,
    "addMaterialBtn": addMaterial,
    "addEnchantBtn": addEnchant,
    "addEquipmentBtn": addEquipment,
    "addItemBtn": addItem,
    "addFumbleBtn": addFumble,
    "rollBtn": rollD20,
    "clearDiceLogBtn": () => { data.diceLog = []; save(); renderLog(); },
    "statCheckBtn": runSkillCheck,
    "addTurnBtn": addTurn,
    "nextTurnBtn": nextTurn,
    "loadBossBtn": loadActiveBoss,
    "hideBossesBtn": () => { data.activeBossIds = []; save(); renderActiveBosses(); },
    "loadNpcBtn": loadActiveNpc,
    "hideNpcsBtn": () => { data.activeNpcIds = []; save(); renderActiveNpcs(); },
    "endCombatBtn": endCombat,
    "closeInventoryBtn": () => $("inventoryModal")?.classList.add("hidden"),
    "closeSkillBtn": () => $("skillModal")?.classList.add("hidden"),
    "closeLevelBtn": () => $("levelModal")?.classList.add("hidden"),
    "addShopGoodsBtn": addShopGoods,
    "addUpgradeRuleBtn": addUpgradeRule,
    "advanceWorldBtn": advanceWorldEvents,
    "rollEncounterBtn": rollEncounter,
    "openShopBtn": openShop,
    "closeShopBtn": () => $("shopModal")?.classList.add("hidden"),
    "openUpgradeBtn": openUpgrade,
    "closeUpgradeBtn": () => $("upgradeModal")?.classList.add("hidden"),
    "effectBossBtn": () => screenEffect("boss"),
    "effectHitBtn": () => screenEffect("hit"),
    "effectDangerBtn": () => screenEffect("danger"),
    "openPlayerViewBtn": enterPlayerMode,
    "partialResetBtn": openPartialResetModal,
    "saveForgeConfigBtn": saveForgeConfig,
    "toggleLeftPanelBtn": () => $("leftPanel")?.classList.toggle("collapsed"),
    "toggleLogBtn": () => $("logPanel")?.classList.toggle("hidden-log"),
    "togglePlayersBtn": () => $("playerHud")?.classList.toggle("hidden"),
    "quickBossEffect": () => screenEffect("boss"),
    "quickDangerEffect": () => screenEffect("danger")
  };

  for (const [id, fn] of Object.entries(clicks)) {
    $(id)?.addEventListener("click", fn);
  }

  const changes = {
    "importFile": importData,
    "mapImageFile": e => readImage(e, v => appState.tempMapImage = v),
    "playerPortrait": e => readImage(e, v => appState.tempPlayerPortrait = v),
    "npcPortrait": e => readImage(e, v => appState.tempNpcPortrait = v),
    "equipmentImage": e => readImage(e, v => appState.tempEquipmentImage = v),
    "itemImage": e => readImage(e, v => appState.tempItemImage = v),
    "forgeImage": e => readImage(e, v => appState.tempForgeImage = v),
    "npcJobConfigSelect": fillNpcJobConfigForm,
    "checkActorSelect": renderRuntimeSkillSelect,
    "runtimeSkillSelect": applyRuntimeSkill,
    "shopGoodsType": fillShopGoodsSelect,
    "forgeNpcSelect": renderForgeConfigForm
  };

  for (const [id, fn] of Object.entries(changes)) {
    $(id)?.addEventListener("change", fn);
  }

  $("masterLoginPassword")?.addEventListener("keydown", (e) => { if (e.key === "Enter") confirmMasterLogin(); });

  ["inventoryModal", "skillModal", "levelModal", "shopModal", "upgradeModal"].forEach(id => {
    $(id)?.addEventListener("click", e => { if (e.target.id === id) $(id).classList.add("hidden"); });
  });

  setupSceneDragDrop();
  bindToastFeedback();
  bindMasterCategoryTabs();
  bindAdvancedSystems();
  bindCreationSystem();
  document.addEventListener("click", handlePlayerDelegatedClick);
  document.addEventListener("change", handleDelegatedChange);

  setInterval(updateHudBar, 300);
}

export function createEmptyData() {
  const empty = structuredClone(defaultData);
  empty.mode = "master";
  empty.access = { role: "master", masterPassword: "" };
  empty.diceLog = [];
  empty.sceneHistory = [];
  empty.activeMapId = "";
  empty.activeBossIds = [];
  empty.activeNpcIds = [];
  empty.currentTurn = 0;
  empty.turns = [];
  [
    "maps", "conditions", "skills", "players", "npcs", "bosses", "items",
    "materials", "enchants", "equipments", "fumbles", "shops", "upgradeRules",
    "worldEvents", "encounters", "factions", "skillTrees"
  ].forEach(key => empty[key] = []);
  empty.forges = {};
  empty.saveSlots = {};
  empty.creation = structuredClone(defaultData.creation);
  empty.playerSession = structuredClone(defaultData.playerSession);
  empty.advanced = structuredClone(defaultData.advanced);
  empty.editing = {};
  return empty;
}

export function resetAllData() {
  if (!confirm("캐릭터, NPC, 직업, 아이템, 상점, 장면, 로그, 설정을 전부 초기화할까요?")) return;
  Object.assign(data, createEmptyData());
  save();
  appState.tempMapImage = "";
  appState.tempPlayerPortrait = "";
  appState.tempNpcPortrait = "";
  appState.tempEquipmentImage = "";
  appState.tempItemImage = "";
  appState.tempForgeImage = "";
  appState.tempMapEffects = [];
  appState.tempBossFumbles = [];
  renderAll();
  showToast("전체 데이터 초기화 완료");
}

