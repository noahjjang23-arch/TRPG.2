import { appState, $, data, defaultData } from "./constants_data.js";
import { save } from "./main.js";
import { renderAll } from "./rendering.js";
import {
  deleteShopGoods, deleteUpgradeRule, deleteWorldEvent, deleteEncounter,
  deleteFaction, removeTempTreeSkill, deleteSkillTree, loadSlot, deleteSlot,
  buyGoods, tryUpgrade, removeTempClassSkill, deleteCreationClass, showToast
} from "./combat.js";
import {
  changeCreationStat, loginPlayerCharacter, playerSpendStatPoint,
  deleteMerchantShopGoods, buyMainSceneShop, setForgeTab, toggleForgeEquipmentList,
  selectForgeEquipment, runForgeEnhance, repairForgeEquipment, buyFromMerchant,
  leavePlayerCharacter, setCreationStatValue, openMainSceneShop, openMainSceneForge
} from "./creation.js";
import {
  deletePlayer, deleteNpc, removeTempBossFumble, deleteBoss, deleteMaterial,
  deleteEnchant, deleteEquipment, deleteItem, deleteFumble, changePlayerHpPrompt,
  changePlayerGoldPrompt, addPlayerConditionPrompt, removePlayerConditionPrompt,
  selectMainPlayerCharacter, editPlayerCharacterPrompt, deletePlayerFromMain,
  openInventory, equip, unequip, useItem, openSkills, openLevelModal,
  increaseStat, hideBoss, hideNpc, toggleNpcJob, grantBossReward
} from "./crud.js";
import {
  removeTempMapEffect, deleteMap, setScene, deleteCondition, deleteSkill
} from "./rendering.js";
import { createRoom, joinRoom, leaveRoom } from "./sync.js";

export function openPartialResetModal() {
  const targets = [
    ["players", "캐릭터", () => { data.players = []; data.playerSession.currentPlayerId = ""; }],
    ["npcs", "NPC", () => { data.npcs = []; data.activeNpcIds = []; data.creation.merchantShops = []; data.creation.shopLooks = {}; }],
    ["classes", "직업", () => { data.creation.classes = []; data.playerSession.classRoll = 0; data.playerSession.classRollsUsed = 0; }],
    ["items", "아이템/장비", () => { data.items = []; data.equipments = []; data.materials = []; data.enchants = []; }],
    ["shops", "상점", () => { data.shops = []; data.creation.merchantShops = []; data.creation.shopLooks = {}; }],
    ["scenes", "장면/맵", () => { data.maps = []; data.sceneHistory = []; data.activeMapId = ""; }],
    ["logs", "로그/턴", () => { data.diceLog = []; data.turns = []; data.currentTurn = 0; data.round = 0; }],
    ["settings", "설정", () => { data.access = { role: "master", masterPassword: "" }; data.creation = structuredClone(defaultData.creation); }]
  ];
  const existing = $("partialResetModal");
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.id = "partialResetModal";
  modal.className = "modal";
  modal.innerHTML = `<div class="modal-content partial-reset-content">
    <div class="modal-header">
      <h2>일부 데이터 초기화</h2>
      <button id="closePartialResetBtn" class="danger">닫기</button>
    </div>
    <p class="muted">초기화할 항목을 선택하세요. 선택 전 확인창이 한 번 더 표시됩니다.</p>
    <div class="partial-reset-grid">
      ${targets.map(([key, label]) => `<button class="danger" data-reset-scope="${key}">${label} 초기화</button>`).join("")}
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => {
    if (e.target.id === "partialResetModal" || e.target.id === "closePartialResetBtn") modal.remove();
    const btn = e.target.closest?.("[data-reset-scope]");
    if (!btn) return;
    const target = targets.find(([key]) => key === btn.dataset.resetScope);
    if (!target) return;
    if (!confirm(`${target[1]} 데이터를 초기화할까요?`)) return;
    target[2]();
    save();
    modal.remove();
    renderAll();
    showToast(`${target[1]} 초기화 완료`);
  });
}

export function handlePlayerDelegatedClick(e) {
  // Legacy / custom attributes checks first
  const statBtn = e.target.closest?.("[data-creation-stat]");
  if (statBtn) {
    e.preventDefault();
    changeCreationStat(statBtn.dataset.creationStat, Number(statBtn.dataset.delta || 0));
    return;
  }

  const lobbyCard = e.target.closest?.(".player-lobby-card[data-player-id]");
  if (lobbyCard) {
    e.preventDefault();
    loginPlayerCharacter(lobbyCard.dataset.playerId);
    return;
  }

  const classDelete = e.target.closest?.("[data-delete-class]");
  if (classDelete) {
    e.preventDefault();
    deleteCreationClass(classDelete.dataset.deleteClass);
    return;
  }

  // Unified data-action delegation
  const target = e.target.closest?.("[data-action]");
  if (!target) return;

  e.preventDefault();
  const action = target.dataset.action;
  const id = target.dataset.id;
  const index = target.dataset.index !== undefined ? Number(target.dataset.index) : null;
  const name = target.dataset.name;

  switch (action) {
    // Master delete / remove lists
    case "delete-player":
      deletePlayer(id);
      break;
    case "delete-npc":
      deleteNpc(id);
      break;
    case "delete-boss":
      deleteBoss(id);
      break;
    case "delete-material":
      deleteMaterial(id);
      break;
    case "delete-enchant":
      deleteEnchant(id);
      break;
    case "delete-equipment":
      deleteEquipment(id);
      break;
    case "delete-item":
      deleteItem(id);
      break;
    case "delete-fumble":
      deleteFumble(id);
      break;
    case "delete-shop-goods":
      deleteShopGoods(id);
      break;
    case "delete-upgrade-rule":
      deleteUpgradeRule(id);
      break;
    case "delete-world-event":
      deleteWorldEvent(id);
      break;
    case "delete-encounter":
      deleteEncounter(id);
      break;
    case "delete-faction":
      deleteFaction(id);
      break;
    case "delete-skill-tree":
      deleteSkillTree(id);
      break;
    case "delete-map":
      deleteMap(id);
      break;
    case "delete-condition":
      deleteCondition(id);
      break;
    case "delete-skill":
      deleteSkill(id);
      break;

    // Temporary list item removals
    case "remove-temp-map-effect":
      removeTempMapEffect(index);
      break;
    case "remove-temp-boss-fumble":
      removeTempBossFumble(index);
      break;
    case "remove-temp-tree-skill":
      removeTempTreeSkill(index);
      break;
    case "remove-temp-class-skill":
      removeTempClassSkill(index);
      break;

    // Player slots and inventory actions
    case "load-slot":
      loadSlot(name);
      break;
    case "delete-slot":
      deleteSlot(name);
      break;
    case "buy-goods":
      buyGoods(target.dataset.shopId, target.dataset.playerId);
      break;
    case "try-upgrade":
      tryUpgrade(target.dataset.eqId, target.dataset.ruleId);
      break;
    case "open-inventory":
      openInventory(name);
      break;
    case "equip":
      equip(id);
      break;
    case "unequip":
      unequip(id);
      break;
    case "use-item":
      useItem(id);
      break;
    case "open-skills":
      openSkills(id);
      break;
    case "open-level-modal":
      openLevelModal(id);
      break;
    case "increase-stat":
      appState.selectedLevelPlayerId = target.dataset.levelPlayer || appState.selectedLevelPlayerId;
      increaseStat(target.dataset.stat);
      break;

    // Boss & NPC actions
    case "grant-boss-reward":
      grantBossReward(id);
      break;
    case "hide-boss":
      hideBoss(id);
      break;
    case "toggle-npc-job":
      toggleNpcJob(id);
      break;
    case "hide-npc":
      hideNpc(id);
      break;

    // Shop and forge actions
    case "open-main-scene-shop":
      openMainSceneShop(id);
      break;
    case "open-main-scene-forge":
      openMainSceneForge(id);
      break;
    case "buy-from-merchant":
      buyFromMerchant(id);
      break;
    case "delete-merchant-shop-goods":
      deleteMerchantShopGoods(id);
      break;
    case "buy-main-scene-shop":
      buyMainSceneShop(id);
      break;
    case "set-forge-tab":
      setForgeTab(target.dataset.npcId, target.dataset.tab, target.dataset.surface);
      break;
    case "toggle-forge-equipment-list":
      toggleForgeEquipmentList(target.dataset.npcId, target.dataset.surface);
      break;
    case "select-forge-equipment":
      selectForgeEquipment(target.dataset.npcId, target.dataset.eqId, target.dataset.surface);
      break;
    case "run-forge-enhance":
      runForgeEnhance(target.dataset.npcId, target.dataset.surface);
      break;
    case "repair-forge-equipment":
      repairForgeEquipment(target.dataset.npcId, target.dataset.eqId, target.dataset.surface);
      break;

    // Creation character actions
    case "leave-character":
      leavePlayerCharacter();
      break;
    case "login-player-character":
      loginPlayerCharacter(id);
      break;
    case "delete-creation-class":
      deleteCreationClass(id);
      break;
    case "player-spend-stat-point":
      playerSpendStatPoint(target.dataset.playerId, target.dataset.stat);
      break;

    // Map and scene actions
    case "set-scene":
      setScene(target.dataset.src);
      break;

    // SFX playback
    case "play-sfx":
      new Audio(target.dataset.url).play().catch(() => {});
      break;

    // Real-time Sync handlers
    case "create-room":
      createRoom();
      break;
    case "join-room":
      const roomInputVal = $("syncRoomInput")?.value;
      joinRoom(roomInputVal);
      break;
    case "leave-room":
      leaveRoom();
      break;
    case "copy-share-link":
      const shareLink = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${appState.currentRoomId}`;
      navigator.clipboard.writeText(shareLink).then(() => {
        showToast("공유 링크가 복사되었습니다!");
      }).catch(() => {
        alert("링크 복사 실패. 방 코드: " + appState.currentRoomId);
      });
      break;

    // Player prompt handlers
    case "change-player-hp":
      changePlayerHpPrompt(id);
      break;
    case "change-player-gold":
      changePlayerGoldPrompt(id);
      break;
    case "add-player-condition":
      addPlayerConditionPrompt(id);
      break;
    case "remove-player-condition":
      removePlayerConditionPrompt(id);
      break;
  }
}

export function handleDelegatedChange(e) {
  const statInput = e.target.closest?.("[data-creation-stat-input]");
  if (statInput) {
    setCreationStatValue(statInput.dataset.creationStatInput, Number(statInput.value || 0));
  }
}

export function bindToastFeedback() {
  document.querySelectorAll("button").forEach(btn => {
    const txt = (btn.textContent || "").trim();
    if (/저장|적용|추가|수정|불러오기|지급|초기화|구매|도전/.test(txt)) {
      btn.addEventListener("click", () => {
        setTimeout(() => showToast(`${txt} 처리 완료`), 120);
      });
    }
  });
}
