
export const STORAGE_KEY = "trpg_master_dashboard_v13_complete";
export const $ = (id) => document.getElementById(id);

export const COMMON_STATS = ["STR", "DEX", "VIT", "INT", "WIS", "CHA", "MND", "LUK", "FAITH", "FAME"];
export const STAT_LABELS = {
  STR: "STR 힘", DEX: "DEX 민첩", VIT: "VIT 체력", INT: "INT 지능", WIS: "WIS 지혜",
  CHA: "CHA 매력", MND: "MND 정신력", LUK: "LUK 행운", FAITH: "신앙", FAME: "명성도"
};
export const EQUIP_SLOTS = {
  weapon: "무기", helmet: "투구", armor: "갑옷", gloves: "장갑", boots: "신발", accessory1: "악세사리 1", accessory2: "악세사리 2"
};

export const appState = {
  selectedLevelPlayerId: null,
  selectedInventoryPlayerName: "",
  tempMapImage: "",
  tempPlayerPortrait: "",
  tempNpcPortrait: "",
  tempEquipmentImage: "",
  tempItemImage: "",
  tempForgeImage: "",
  tempMapEffects: [],
  currentForgeState: { npcId: "", tab: "enhance", selectedEquipmentId: "", listOpen: false, surface: "main" },
  tempBossFumbles: [],
  tempTreeSkills: [],
  tempNewPlayerPortrait: "",
  tempMerchantShopImage: "",
  tempClassSkillIds: [],
  currentRoomId: "",
  isSyncing: false
};

export const defaultData = {
  mode: "mode",
  round: 0,
  diceLog: [],
  sceneHistory: [],
  activeMapId: "",
  activeBossIds: [],
  currentTurn: 0,
  turns: [],
  maps: [],
  conditions: [],
  skills: [],
  players: [],
  npcs: [],
  bosses: [],
  items: [],
  materials: [],
  enchants: [],
  equipments: [],
  fumbles: [],
  shops: [],
  forges: {},
  upgradeRules: [],
  worldEvents: [],
  encounters: [],
  factions: [],
  skillTrees: [],
  saveSlots: {},
  worldState: { turn: 0, weather: "맑음", time: "낮" },
  activeNpcIds: [],
  npcJobConfigs: {
    merchant: { title: "상인", desc: "물건을 사고팔 수 있는 NPC." },
    enchanter: { title: "인첸트", desc: "장비에 인챈트를 부여하거나 해제할 수 있는 NPC." },
    repair: { title: "강화/수리", desc: "장비 강화와 내구도 수리를 담당하는 NPC." },
    quest: { title: "퀘스트수주", desc: "퀘스트를 주거나 완료 보상을 지급하는 NPC." },
    god: { title: "신", desc: "강력한 축복, 저주, 신앙 관련 판정을 담당하는 존재." }
  },
  access: { role: "none", masterPassword: "" },
  creation: {
    diceSides: 20,
    rollLimit: 3,
    classRollLimit: 3,
    unusedGold: 10,
    unusedExp: 5,
    unusedEquipmentId: "",
    classes: [],
    merchantShops: [],
    shopLooks: {}
  },
  playerSession: {
    currentPlayerId: "",
    creationRoll: 0,
    creationRollsUsed: 0,
    classRoll: 0,
    classRollsUsed: 0,
    creationRemaining: 0,
    creationStats: {}
  },
  advanced: {
    cutscenes: [],
    sfx: [],
    fearRules: [],
    curses: [],
    deities: [],
    resources: [],
    bossPhases: [],
    bossParts: [],
    inspections: [],
    dungeonNodes: [],
    environments: [],
    camps: [],
    timers: [],
    worldChanges: [],
    recipes: [],
    sets: [],
    personalQuests: [],
    memories: [],
    endings: [],
    sessionNotes: []
  },
  editing: {}
};

export let data = structuredClone(defaultData);


