import { buildStatInputs } from "./ui_helpers.js";
import {$,  COMMON_STATS, STORAGE_KEY, data, defaultData } from "./constants_data.js";
import { bindEvents } from "./events.js";
import { renderAll } from "./rendering.js";

export function init() {
  seedIfEmpty();
  buildStatInputs();
  bindEvents();

  // URL에서 room 파라미터가 있는지 검사하여 자동 동기화 참여
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("room");
  if (roomId) {
    import("./sync.js").then(({ joinRoom }) => {
      joinRoom(roomId);
    });
  } else {
    import("./sync.js").then(({ updateSyncStatusUI }) => {
      updateSyncStatusUI();
    });
  }

  renderAll();
}

export function seedIfEmpty() {
  if (!data.conditions.length) {
    data.conditions.push(
      { id: makeId(), name: "중독", stat: "VIT", effect: "dot", value: 3, duration: 3, desc: "턴마다 HP 3 감소" },
      { id: makeId(), name: "보호막", stat: "VIT", effect: "shield", value: 10, duration: 1, desc: "피해 10 흡수" },
      { id: makeId(), name: "약화", stat: "STR", effect: "statDown", value: 2, duration: 2, desc: "STR -2" }
    );
  }
  if (!data.players.length) {
    data.players.push({
      id: makeId(), name: "아렌", level: 1, exp: 0, nextExp: 100, statPoints: 0,
      hp: 32, maxHp: 40, mp: 12, maxMp: 20, gold: 120, hype: 3, status: "정상", memo: "전방 탱커",
      portrait: "", stats: baseStats({ STR: 4, DEX: 2, VIT: 5, INT: 1, WIS: 2, MND: 3, LUK: 1, FAME: 1 }), conditions: [], disabledWeaponTurns: 0
    });
  }
  if (!data.maps.length) {
    data.maps.push({ id: makeId(), name: "검은 숲", desc: "빛이 거의 들지 않는 숲. 축축한 공기와 낮은 속삭임이 흐른다.", bgm: "", image: "", effects: [] });
  }
  if (!data.bosses.length) {
    data.bosses.push({
      id: makeId(), name: "고블린 왕", hp: 100, maxHp: 100, status: "정상", attackType: "blunt", memo: "첫 보스",
      stats: baseStats({ STR: 5, DEX: 2, VIT: 5, MND: 2, LUK: 1 }), conditions: [], fumbleIds: [],
      reward: { exp: 120, gold: 80, itemName: "고블린 왕의 뿔", itemQty: 1, itemDesc: "전리품" }
    });
  }
  if (!data.materials.length) {
    data.materials.push({ id: makeId(), name: "강철", durabilityBonus: 20, stats: baseStats({ STR: 1 }), desc: "단단하고 무난한 소재" });
  }
  if (!data.fumbles.length) {
    data.fumbles.push({ id: makeId(), name: "무기 삐끗", type: "weaponDurability", stat: "STR", value: -10, duration: 1, desc: "무기 내구도 -10" });
  }
  if (!data.factions.length) {
    data.factions.push({ id: makeId(), name: "황금상단", rep: 0, desc: "상인 연합 세력" });
  }
  if (!data.encounters.length) {
    data.encounters.push({ id: makeId(), name: "수상한 발자국", weight: 3, desc: "흙길 위에 사람과 짐승의 발자국이 뒤섞여 있다." });
  }
  if (!data.upgradeRules.length) {
    data.upgradeRules.push({ id: makeId(), level: 1, success: 100, cost: 20, statBonus: 1, durabilityPenalty: 0, breakable: false });
  }
  save();
}

export function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultData);
    const parsed = JSON.parse(saved);
    normalize(parsed);
    return parsed;
  } catch {
    return structuredClone(defaultData);
  }
}

export function normalize(d) {
  Object.keys(defaultData).forEach(k => d[k] ??= structuredClone(defaultData[k]));
  ["players", "npcs", "bosses"].forEach(group => {
    d[group].forEach(a => {
      a.stats = baseStats(a.stats);
      a.conditions ??= a.appliedConditions ?? [];
      a.disabledWeaponTurns ??= 0;
      if (group === "npcs") { a.job ??= "merchant"; a.portrait ??= ""; }
    });
  });
  d.players.forEach(p => { p.level ??= 1; p.exp ??= 0; p.nextExp ??= 100; p.statPoints ??= 0; p.hype ??= 0; });
  d.maps.forEach(m => { m.effects ??= []; });
  d.items.forEach(i => { i.image ??= ""; i.qty ??= 1; i.owner ??= ""; });
  d.activeNpcIds ??= [];
  d.shops ??= [];
  d.forges ??= {};
  Object.keys(d.forges).forEach(id => {
    d.forges[id] = normalizeForgeConfig(d.forges[id]);
  });
  d.upgradeRules ??= [];
  d.worldEvents ??= [];
  d.encounters ??= [];
  d.factions ??= [];
  d.skillTrees ??= [];
  d.saveSlots ??= {};
  d.access ??= { role: "none", masterPassword: "" };
  d.creation ??= structuredClone(defaultData.creation);
  d.creation.classes ??= [];
  d.creation.classes.forEach(c => {
    c.minRoll ??= 1;
    c.maxRoll ??= 20;
    c.desc ??= "";
    c.statMods = baseStats(c.statMods);
    c.isMerchant ??= false;
    c.shopNpcId ??= "";
    c.skillIds ??= [];
  });
  d.creation.rollLimit ??= 3;
  d.creation.classRollLimit ??= 3;
  d.creation.merchantShops ??= [];
  d.creation.shopLooks ??= {};
  d.playerSession ??= structuredClone(defaultData.playerSession);
  d.playerSession.creationRollsUsed ??= 0;
  d.playerSession.classRoll ??= 0;
  d.playerSession.classRollsUsed ??= 0;
  d.playerSession.creationStats ??= {};
  d.advanced ??= structuredClone(defaultData.advanced);
  Object.keys(defaultData.advanced).forEach(k => d.advanced[k] ??= []);
  d.worldState ??= { turn: 0, weather: "맑음", time: "낮" };
  d.npcJobConfigs ??= structuredClone(defaultData.npcJobConfigs);
  d.bosses.forEach(b => { b.fumbleIds ??= []; b.attackType ??= "slash"; b.reward ??= { exp: 0, gold: 0, itemName: "", itemQty: 1, itemDesc: "" }; });
  d.materials.forEach(m => { m.stats = baseStats(m.stats); });
  d.enchants.forEach(e => { e.stats = baseStats(e.stats); });
  d.equipments.forEach(e => { e.stats = baseStats(e.stats); e.durability ??= e.maxDurability ?? 10; e.maxDurability ??= e.durability ?? 10; e.attackType ??= "slash"; e.resists ??= { slash: 0, pierce: 0, blunt: 0, special: 0 }; e.owner ??= e.equippedBy || ""; e.upgradeLevel ??= 0; });
}

export function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  import("./sync.js").then(({ saveToFirestore }) => {
    saveToFirestore();
  });
}
export function makeId() { return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2); }
export function baseStats(values = {}) { const o = {}; COMMON_STATS.forEach(s => o[s] = Number(values[s] || 0)); return o; }
export function normalizeForgeConfig(cfg = {}) {
  return {
    image: cfg.image || "",
    intro: cfg.intro || "무기와 장비를 손질하는 대장간입니다.",
    upgradePrice: Number(cfg.upgradePrice ?? 30),
    repairPrice: Number(cfg.repairPrice ?? 2),
    mode: cfg.mode || "chance",
    successChance: Number(cfg.successChance ?? 70),
    destroyFrom: Number(cfg.destroyFrom ?? 8)
  };
}

