import { classRollText, classStatText, damage, isClassAllowedByRoll, showToast } from "./combat.js";
import { baseStats, makeId, normalize, normalizeForgeConfig, save } from "./main.js";
import { appState, $, COMMON_STATS, STAT_LABELS, data } from "./constants_data.js";
import { clearInputs, renderAll } from "./rendering.js";

export function rollCreationStats() {
  const limit = Math.max(1, Number(data.creation.rollLimit || 3));
  data.playerSession.creationRollsUsed = Number(data.playerSession.creationRollsUsed || 0);
  if (data.playerSession.creationRollsUsed >= limit) {
    alert(`초기 스탯 주사위는 최대 ${limit}번까지 굴릴 수 있습니다.`);
    return;
  }
  const sides = Math.max(1, Number(data.creation.diceSides || 20));
  const roll = Math.floor(Math.random() * sides) + 1;
  data.playerSession.creationRollsUsed++;
  data.playerSession.creationRoll = roll;
  data.playerSession.creationRemaining = roll;
  data.playerSession.creationStats = {};
  COMMON_STATS.forEach(s => data.playerSession.creationStats[s] = 0);
  save();
  renderCreationStatsGrid();
  renderCreationClassSelect();
  showToast(`초기 스탯 ${roll}점 획득 (${data.playerSession.creationRollsUsed}/${limit})`);
}

export function renderCreationStatsGrid() {
  const box = $("creationStatsGrid");
  if (!box) return;
  data.playerSession.creationStats ??= {};
  COMMON_STATS.forEach(s => data.playerSession.creationStats[s] ??= 0);
  box.innerHTML = COMMON_STATS.map(stat => `
    <div class="creation-stat-row">
      <strong>${STAT_LABELS[stat]}</strong>
      <div class="stat-controls">
        <button class="creation-stat-btn" data-creation-stat="${stat}" data-delta="-1">-</button>
        <input class="creation-stat-input" type="number" min="0" data-creation-stat-input="${stat}" value="${data.playerSession.creationStats[stat] || 0}" />
        <button class="creation-stat-btn" data-creation-stat="${stat}" data-delta="1">+</button>
      </div>
    </div>
  `).join("");
  if ($("remainingStatPoints")) $("remainingStatPoints").textContent = `남은 포인트: ${data.playerSession.creationRemaining || 0}`;
  if ($("creationRollResult")) $("creationRollResult").textContent = data.playerSession.creationRoll ? `스탯 포인트: ${data.playerSession.creationRoll}` : "스탯 포인트: -";
  if ($("creationRollCountView")) $("creationRollCountView").textContent = `남은 굴림: ${Math.max(0, Number(data.creation.rollLimit || 3) - Number(data.playerSession.creationRollsUsed || 0))} / ${data.creation.rollLimit || 3}`;
  if ($("classRollResult")) $("classRollResult").textContent = data.playerSession.classRoll ? `직업 주사위: ${data.playerSession.classRoll}` : "직업 주사위: -";
  if ($("classRollCountView")) $("classRollCountView").textContent = `직업 굴림 남음: ${Math.max(0, Number(data.creation.classRollLimit || 3) - Number(data.playerSession.classRollsUsed || 0))} / ${data.creation.classRollLimit || 3}`;
}

export function changeCreationStat(stat, delta) {
  data.playerSession.creationStats ??= {};
  data.playerSession.creationStats[stat] ??= 0;
  if (delta > 0 && data.playerSession.creationRemaining <= 0) return;
  if (delta < 0 && data.playerSession.creationStats[stat] <= 0) return;
  data.playerSession.creationStats[stat] += delta;
  data.playerSession.creationRemaining -= delta;
  save();
  renderCreationStatsGrid();
}

export function setCreationStatValue(stat, value) {
  data.playerSession.creationStats ??= {};
  const cleanValue = Math.max(0, Number(value || 0));
  data.playerSession.creationStats[stat] = cleanValue;
  if (Number(data.playerSession.creationRoll || 0) > 0) {
    const used = COMMON_STATS.reduce((sum, s) => sum + Number(data.playerSession.creationStats?.[s] || 0), 0);
    if (used > Number(data.playerSession.creationRoll || 0)) {
      data.playerSession.creationStats[stat] = Math.max(0, cleanValue - (used - Number(data.playerSession.creationRoll || 0)));
    }
    const finalUsed = COMMON_STATS.reduce((sum, s) => sum + Number(data.playerSession.creationStats?.[s] || 0), 0);
    data.playerSession.creationRemaining = Math.max(0, Number(data.playerSession.creationRoll || 0) - finalUsed);
  }
  save();
  renderCreationStatsGrid();
}

export function rollClassDice() {
  const limit = Math.max(1, Number(data.creation.classRollLimit || 3));
  data.playerSession.classRollsUsed = Number(data.playerSession.classRollsUsed || 0);
  if (data.playerSession.classRollsUsed >= limit) {
    alert(`직업 주사위는 최대 ${limit}번까지 굴릴 수 있습니다.`);
    return;
  }
  const roll = Math.floor(Math.random() * 20) + 1;
  data.playerSession.classRollsUsed++;
  data.playerSession.classRoll = roll;
  save();
  renderCreationStatsGrid();
  renderCreationClassSelect();
  showToast(`직업 주사위 ${roll} (${data.playerSession.classRollsUsed}/${limit})`);
}

export function renderCreationClassSelect() {
  const sel = $("creationClassSelect");
  if (!sel) return;
  const roll = Number(data.playerSession.classRoll || 0);
  const prev = sel.value;
  sel.innerHTML = `<option value="">직업 선택 안 함</option>`;
  data.creation.classes
    .filter(c => isClassAllowedByRoll(c, roll))
    .sort((a, b) => a.minRoll - b.minRoll)
    .forEach(c => sel.add(new Option(`${c.name} (${classRollText(c)})`, c.id)));
  if (prev) sel.value = prev;
  renderCreationClassDesc();
}

export function renderCreationClassDesc() {
  const box = $("creationClassDesc");
  if (!box) return;
  const c = data.creation.classes.find(x => x.id === $("creationClassSelect")?.value);
  if (!c) {
    box.textContent = "선택 가능한 직업이 없거나 선택하지 않았습니다.";
    return;
  }
  const skills = (c.skillIds || []).map(id => data.skills.find(s => s.id === id)?.name).filter(Boolean).join(", ") || "없음";
  const shop = c.shopNpcId ? data.npcs.find(n => n.id === c.shopNpcId)?.name || "연결 상점" : "없음";
  box.textContent = `${c.name}\n조건: ${classRollText(c)}\n${c.desc || ""}\n스탯 보정: ${classStatText(c.statMods)}\n상인 직업: ${c.isMerchant ? "예" : "아니오"} / 연결 상점: ${shop}\n초기 스킬: ${skills}`;
}

export function createPlayerFromPortal() {
  const name = $("newPlayerName")?.value.trim();
  if (!name) return alert("캐릭터 이름을 입력하세요.");

  const password = $("newPlayerPassword")?.value || "";
  const stats = baseStats(data.playerSession.creationStats || {});
  const selectedClass = data.creation.classes.find(c => c.id === $("creationClassSelect")?.value);
  if (selectedClass && !isClassAllowedByRoll(selectedClass, Number(data.playerSession.classRoll || 0))) {
    return alert("현재 직업 주사위 결과로 선택할 수 없는 직업입니다.");
  }
  COMMON_STATS.forEach(stat => {
    stats[stat] = Number(stats[stat] || 0) + Number(selectedClass?.statMods?.[stat] || 0);
  });
  const maxHp = 30 + Number(stats.VIT || 0) * 2;
  const maxMp = 10 + Number(stats.INT || 0) + Number(stats.MND || 0);
  const remaining = Number(data.playerSession.creationRemaining || 0);

  let gold = 0;
  let exp = 0;
  if ($("skipUnusedStatsReward")?.checked) {
    gold += remaining * Number(data.creation.unusedGold || 0);
    exp += remaining * Number(data.creation.unusedExp || 0);
  }

  const player = {
    id: makeId(),
    name,
    password,
    classId: selectedClass?.id || "",
    className: selectedClass?.name || "무직",
    level: 1,
    exp,
    nextExp: 100,
    statPoints: 0,
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    gold,
    hype: 0,
    status: "정상",
    memo: "플레이어 화면에서 생성됨",
    portrait:
      stats,
    conditions: [],
    disabledWeaponTurns: 0
  };

  data.players.push(player);

  if (selectedClass?.skillIds?.length) {
    selectedClass.skillIds.forEach(skillId => {
      const sk = data.skills.find(s => s.id === skillId);
      if (sk) {
        data.skills.push({ ...structuredClone(sk), id: makeId(), ownerType: "player", ownerId: player.id, forSale: false });
      }
    });
  }

  if ($("skipUnusedStatsReward")?.checked && remaining > 0 && data.creation.unusedEquipmentId) {
    const eq = data.equipments.find(e => e.id === data.creation.unusedEquipmentId);
    if (eq) data.equipments.push({ ...structuredClone(eq), id: makeId(), equippedBy: "" });
  }

  data.playerSession.currentPlayerId = player.id;
  data.playerSession.creationRoll = 0;
  data.playerSession.creationRollsUsed = 0;
  data.playerSession.classRoll = 0;
  data.playerSession.classRollsUsed = 0;
  data.playerSession.creationRemaining = 0;
  data.playerSession.creationStats = {};
  appState.tempNewPlayerPortrait = "";
  clearInputs(["newPlayerName", "newPlayerPassword"]);
  save();
  renderAll();
  showToast("캐릭터 생성 완료");
}

export function leavePlayerCharacter() {
  data.playerSession.currentPlayerId = "";
  save();

  const createPanel = $("playerCreatePanel");
  const lobbyPanel = $("playerLobbyPanel");
  const characterPanel = $("playerCharacterPanel");

  if (createPanel) createPanel.classList.remove("hidden");
  if (lobbyPanel) lobbyPanel.classList.remove("hidden");
  if (characterPanel) characterPanel.classList.add("hidden");

  renderPlayerLobbyCards();
  showToast("캐릭터 선택창으로 돌아왔습니다.");
}

export function renderPlayerPortal() {
  if (data.mode !== "player") return;
  const current = data.players.find(p => p.id === data.playerSession.currentPlayerId);
  $("playerCreatePanel")?.classList.toggle("hidden", !!current);
  $("playerLobbyPanel")?.classList.toggle("hidden", !!current);
  $("playerCharacterPanel")?.classList.toggle("hidden", !current);
  renderPlayerLobbyCards();
  if (current) {
    renderCurrentCharacterSheet(current);
    renderInlineShopForCurrentCharacter();
  }
}

export function renderPlayerLobbyCards() {
  const box = $("playerLobbyCards");
  if (!box) return;
  box.innerHTML = data.players.map(p => `
    <div class="player-lobby-card" data-player-id="${p.id}">
      ${p.portrait ? `<img src="${p.portrait}">` : `<div class="portrait-placeholder">NO<br>PORTRAIT</div>`}
      <h3>${esc(p.name)}</h3>
      <p class="muted">Lv.${p.level || 1} / ${esc(p.className || "무직")}</p>
    </div>
  `).join("") || `<p class="muted">생성된 캐릭터가 없습니다.</p>`;

}

export function loginPlayerCharacter(id) {
  const p = data.players.find(x => x.id === id);
  if (!p) return;
  if (p.password) {
    const input = prompt("캐릭터 비밀번호를 입력하세요.");
    if (input !== p.password) {
      alert("비밀번호가 틀렸습니다.");
      return;
    }
  }
  data.playerSession.currentPlayerId = id;
  save();
  renderAll();
  renderInlineShopForCurrentCharacter();
}

export function renderCurrentCharacterSheet(p) {
  const box = $("playerCurrentCharacterSheet");
  if (!box) return;
  const hp = getPercent(p.hp, p.maxHp);
  const mp = getPercent(p.mp, p.maxMp);
  box.innerHTML = `
    ${p.portrait ? `<img class="player-current-portrait" src="${p.portrait}">` : `<div class="player-current-portrait portrait-placeholder">NO<br>PORTRAIT</div>`}
    <h2>${esc(p.name)}</h2>
    <p class="muted">Lv.${p.level || 1} / ${esc(p.className || "무직")}</p>
    <div class="stat-line"><span>HP</span><span>${p.hp}/${p.maxHp}</span></div>
    <div class="small-bar-frame"><div class="hp-bar hp" style="width:${hp}%"></div></div>
    <div class="stat-line"><span>MP</span><span>${p.mp}/${p.maxMp}</span></div>
    <div class="small-bar-frame"><div class="hp-bar mp" style="width:${mp}%"></div></div>
    <p class="player-extra">상태: ${esc(p.status || "정상")}<br>Gold ${p.gold || 0}</p>
    <h3>스탯</h3>
    <div class="character-stat-list">
      ${COMMON_STATS.map(stat => `<div>${STAT_LABELS[stat]}: ${p.stats?.[stat] || 0}</div>`).join("")}
    </div>
    ${Number(p.statPoints || 0) > 0 ? `<div class="level-up-stat-controls">
      <h3>레벨업 스탯 증가 / 남은 포인트 ${p.statPoints}</h3>
      <div class="level-up-stat-grid">
        ${COMMON_STATS.map(stat => `<button data-action="player-spend-stat-point" data-player-id="${p.id}" data-stat="${stat}">${STAT_LABELS[stat]} +1</button>`).join("")}
      </div>
    </div>` : ""}
    <h3>인벤토리</h3>
    <div>${data.items.filter(i => i.owner === p.name || i.owner === "파티 공용").map(i => `<div class="status-pill">${esc(i.name)} x${i.qty}</div>`).join("") || "<p class='muted'>아이템 없음</p>"}</div>
  `;
}

export function playerSpendStatPoint(playerId, stat) {
  const p = data.players.find(x => x.id === playerId);
  if (!p || Number(p.statPoints || 0) <= 0) return;
  p.stats ??= baseStats();
  p.stats[stat] = Number(p.stats[stat] || 0) + 1;
  p.statPoints--;
  if (stat === "VIT") p.maxHp += 2;
  if (stat === "INT" || stat === "MND") p.maxMp += 1;
  save();
  renderAll();
  showToast(`${STAT_LABELS[stat]} 증가`);
}

export function renderMerchantShopSetup() {
  fillMerchantNpcSelect();
  fillMerchantGoodsSelect();
  renderMerchantShopList();
  fillPlayerMerchantSelect();
}

export function fillMerchantNpcSelect() {
  const s = $("merchantShopNpcSelect");
  if (!s) return;
  const prev = s.value;
  s.innerHTML = "";
  const merchants = data.npcs.filter(n => n.job === "merchant" || n.job === "상인" || !n.job);
  merchants.forEach(n => s.add(new Option(n.name, n.id)));
  if (prev) s.value = prev;
  renderMerchantShopLookForm();
}

export function fillMerchantGoodsSelect() {
  const s = $("merchantShopGoodsSelect");
  if (!s) return;
  const prev = s.value;
  const type = $("merchantShopType")?.value || "item";
  s.innerHTML = "";
  const arr = type === "item"
    ? data.items
    : type === "equipment"
      ? data.equipments
      : data.skills;
  arr.forEach(x => s.add(new Option(`${x.name || "이름 없음"}${x.owner ? " / " + x.owner : ""}`, x.id)));
  if (prev) s.value = prev;
}

export function renderMerchantShopLookForm() {
  const npcId = $("merchantShopNpcSelect")?.value;
  if (!npcId) return;
  const look = data.creation.shopLooks?.[npcId] || {};
  if ($("merchantShopIntro")) $("merchantShopIntro").value = look.intro || "";
}

export function saveMerchantShopLook() {
  const npcId = $("merchantShopNpcSelect")?.value;
  if (!npcId) return alert("상인 NPC를 선택하세요.");
  data.creation.shopLooks ??= {};
  data.creation.shopLooks[npcId] = {
    image: appState.tempMerchantShopImage || data.creation.shopLooks[npcId]?.image || "",
    intro: $("merchantShopIntro")?.value || ""
  };
  appState.tempMerchantShopImage = "";
  save();
  renderInlineShopForCurrentCharacter();
  showToast("상점 화면 저장 완료");
}

export function addMerchantShopGoods() {
  const npcId = $("merchantShopNpcSelect")?.value;
  const type = $("merchantShopType")?.value || "item";
  const goodsId = $("merchantShopGoodsSelect")?.value;
  if (!npcId || !goodsId) return alert("상인 NPC와 판매품을 선택하세요.");
  data.creation.merchantShops.push({
    id: makeId(),
    npcId,
    type,
    goodsId,
    price: Number($("merchantShopPrice")?.value || 0),
    stock: $("merchantShopStock")?.value === "" ? null : Number($("merchantShopStock")?.value || 0)
  });
  clearInputs(["merchantShopPrice", "merchantShopStock"]);
  save();
  renderMerchantShopSetup();
  showToast("상인 판매품 추가 완료");
}

export function renderMerchantShopList() {
  const box = $("merchantShopList");
  if (!box) return;
  box.innerHTML = data.creation.merchantShops.map(g => {
    const npc = data.npcs.find(n => n.id === g.npcId);
    const goods = getMerchantGoods(g.type, g.goodsId);
    return `<div class="list-item">
      <div class="row-title">${esc(npc?.name || "?")} / ${esc(goods?.name || "?")}</div>
      <div class="row-meta">${merchantTypeName(g.type)} / ${g.price} Gold / 재고 ${g.stock ?? "무제한"}</div>
      <button class="small danger" data-action="delete-merchant-shop-goods" data-id="${g.id}">삭제</button>
    </div>`;
  }).join("");
}

export function deleteMerchantShopGoods(id) {
  if (!confirm("판매품을 삭제할까요?")) return;
  data.creation.merchantShops = data.creation.merchantShops.filter(x => x.id !== id);
  save();
  renderMerchantShopSetup();
}

export function fillPlayerMerchantSelect() {
  const s = $("playerMerchantSelect");
  if (!s) return;
  const prev = s.value;
  s.innerHTML = "";
  const merchantIds = new Set(data.creation.merchantShops.map(x => x.npcId));
  data.npcs.filter(n => merchantIds.has(n.id)).forEach(n => s.add(new Option(n.name, n.id)));
  if (prev) s.value = prev;
}

export function getVisibleMerchantIdForPlayer() {
  const activeNpcIds = data.activeNpcIds || [];
  const merchantIds = new Set(data.creation.merchantShops.map(x => x.npcId));
  const activeMerchant = activeNpcIds.find(id => merchantIds.has(id));
  if (activeMerchant) return activeMerchant;
  return "";
}

export function renderInlineShopForCurrentCharacter() {
  const player = data.players.find(p => p.id === data.playerSession.currentPlayerId);
  const panel = $("playerInlineShopPanel");
  if (!panel) return;
  const npcId = getVisibleMerchantIdForPlayer();
  if (!player || !npcId) {
    panel.classList.add("hidden");
    return;
  }
  const npc = data.npcs.find(n => n.id === npcId);
  if (!npc) {
    panel.classList.add("hidden");
    return;
  }
  $("inlineShopTitle").textContent = `${npc.name}의 상점`;
  const look = data.creation.shopLooks?.[npcId] || {};
  $("inlineShopIntro").textContent = look.intro || "판매 목록";
  const imgBox = $("inlineShopImageBox");
  if (imgBox) {
    if (look.image) {
      imgBox.style.display = "block";
      imgBox.innerHTML = `<img src="${look.image}">`;
    } else {
      imgBox.style.display = "none";
      imgBox.innerHTML = "";
    }
  }
  renderInlineShopGoods(player, npcId);
  panel.classList.remove("hidden");
}


export function renderInlineShopGoods(player, npcId) {
  const box = $("inlineShopGoodsList");
  if (!box) return;
  const goodsList = data.creation.merchantShops.filter(g => g.npcId === npcId);
  if (!goodsList.length) {
    box.innerHTML = `<p class="muted">판매 목록이 없습니다.</p>`;
    return;
  }
  box.innerHTML = goodsList.map((g, idx) => {
    const goods = getMerchantGoods(g.type, g.goodsId);
    if (!goods) return "";
    const price = Number(g.price || 0);
    const enough = Number(player.gold || 0) >= price;
    const inStock = g.stock === null || Number(g.stock) > 0;
    const canBuy = inStock;
    const desc = getGoodsDesc(goods, g.type);
    const stats = getGoodsStatsText(goods, g.type);
    const img = getGoodsImage(goods, g.type);
    return `<div class="inline-shop-item">
      <div class="inline-shop-index">${idx + 1}</div>
      ${img ? `<img class="shop-goods-thumb" src="${img}">` : `<div class="shop-goods-thumb-placeholder">NO<br>IMG</div>`}
      <div>
        <div class="inline-shop-name">${esc(goods.name || "?")}</div>
        <div class="inline-shop-desc">${esc(desc || "")}</div>
        <div class="inline-shop-stats">${stats}</div>
      </div>
      <div class="inline-shop-price-box">
        <div class="inline-shop-price ${enough ? "" : "not-enough"}">${price} Gold</div>
        <div class="inline-shop-stock">재고 ${g.stock ?? "무제한"}</div>
        <button class="inline-shop-buy-btn" ${canBuy ? "" : "disabled"} data-action="buy-from-merchant" data-id="${g.id}">구매</button>
      </div>
    </div>`;
  }).join("");
}


export function openMainSceneShop(npcId) {
  const npc = data.npcs.find(n => n.id === npcId);
  if (!npc) return alert("상인 NPC를 찾을 수 없습니다.");
  const panel = $("mainSceneShopPanel");
  if (!panel) return;
  $("mainSceneShopTitle").textContent = `${npc.name}의 상점`;
  const look = data.creation.shopLooks?.[npcId] || {};
  $("mainSceneShopIntro").textContent = look.intro || "판매 목록";
  const bg = $("mainSceneShopBg");
  if (bg) {
    if (look.image) {
      bg.classList.remove("no-image");
      bg.style.backgroundImage = `url('${look.image}')`;
    } else {
      bg.classList.add("no-image");
      bg.style.backgroundImage = "";
    }
  }
  renderMainSceneShopGoods(npcId);
  panel.classList.remove("hidden");
  showToast(`${npc.name} 상점을 열었습니다.`);
}

export function closeMainSceneShop() {
  $("mainSceneShopPanel")?.classList.add("hidden");
}

export function getFirstPlayerForMainShop() {
  const current = data.players.find(p => p.id === data.playerSession?.currentPlayerId);
  return current || data.players[0] || null;
}

export function renderMainSceneShopGoods(npcId) {
  const box = $("mainSceneShopGoodsList");
  if (!box) return;
  const player = getFirstPlayerForMainShop();
  const goodsList = data.creation.merchantShops.filter(g => g.npcId === npcId);
  if (!goodsList.length) {
    box.innerHTML = `<p class="muted">판매 목록이 없습니다. 마스터패널의 상인 판매 목록 설정에서 판매품을 추가하세요.</p>`;
    return;
  }
  box.innerHTML = goodsList.map((g, idx) => {
    const goods = getMerchantGoods(g.type, g.goodsId);
    if (!goods) return "";
    const price = Number(g.price || 0);
    const enough = player ? Number(player.gold || 0) >= price : false;
    const inStock = g.stock === null || Number(g.stock) > 0;
    const canBuy = !!player && inStock;
    const desc = getGoodsDesc(goods, g.type);
    const stats = getGoodsStatsText(goods, g.type);
    const img = getGoodsImage(goods, g.type);
    return `<div class="inline-shop-item">
      <div class="inline-shop-index">${idx + 1}</div>
      ${img ? `<img class="shop-goods-thumb" src="${img}">` : `<div class="shop-goods-thumb-placeholder">NO<br>IMG</div>`}
      <div>
        <div class="inline-shop-name">${esc(goods.name || "?")}</div>
        <div class="inline-shop-desc">${esc(desc || "")}</div>
        <div class="inline-shop-stats">${stats}</div>
      </div>
      <div class="inline-shop-price-box">
        <div class="inline-shop-price ${enough ? "" : "not-enough"}">${price} Gold</div>
        <div class="inline-shop-stock">재고 ${g.stock ?? "무제한"}</div>
        <button class="inline-shop-buy-btn" ${canBuy ? "" : "disabled"} data-action="buy-main-scene-shop" data-id="${g.id}">구매</button>
      </div>
    </div>`;
  }).join("");
}

export function buyMainSceneShop(shopId) {
  const player = getFirstPlayerForMainShop();
  const g = data.creation.merchantShops.find(x => x.id === shopId);
  if (!player) return alert("구매할 플레이어가 없습니다. 플레이어 캐릭터를 먼저 생성하거나 선택하세요.");
  if (!g) return;
  const goods = getMerchantGoods(g.type, g.goodsId);
  if (!goods) return alert("상품을 찾을 수 없습니다.");
  const price = Number(g.price || 0);
  if (!confirm(`${price}골드로 ${goods.name}을(를) 구매하시겠습니까?`)) return;
  if (Number(player.gold || 0) < price) return alert("구매 실패: 골드가 부족합니다.");
  if (g.stock !== null && Number(g.stock) <= 0) return alert("구매 실패: 재고가 없습니다.");
  player.gold -= price;
  if (g.stock !== null) g.stock--;
  if (g.type === "item") {
    data.items.push({ ...structuredClone(goods), id: makeId(), owner: player.name, used: false });
  } else if (g.type === "equipment") {
    data.equipments.push({ ...structuredClone(goods), id: makeId(), owner: player.name, equippedBy: "" });
  } else if (g.type === "skill") {
    data.skills.push({ ...structuredClone(goods), id: makeId(), ownerType: "player", ownerId: player.id, forSale: false });
  }
  save();
  showToast(`${goods.name} 구매 완료`);
  renderAll();
  renderMainSceneShopGoods(g.npcId);
}



export function isForgeNpc(n) { return !!n && (n.job === "repair" || n.job === "강화/수리"); }
export function getForgeConfig(npcId) { data.forges ??= {}; data.forges[npcId] = normalizeForgeConfig(data.forges[npcId] || {}); return data.forges[npcId]; }
export function fillForgeSelects() { const s = $("forgeNpcSelect"); if (!s) return; const prev = s.value; s.innerHTML = ""; data.npcs.filter(isForgeNpc).forEach(n => s.add(new Option(n.name, n.id))); if (prev) s.value = prev; renderForgeConfigForm(); }
export function renderForgeConfigForm() { const npcId = $("forgeNpcSelect")?.value; if (!npcId) return; const cfg = getForgeConfig(npcId); if ($("forgeIntro")) $("forgeIntro").value = cfg.intro || ""; if ($("forgeUpgradePrice")) $("forgeUpgradePrice").value = cfg.upgradePrice; if ($("forgeRepairPrice")) $("forgeRepairPrice").value = cfg.repairPrice; if ($("forgeUpgradeMode")) $("forgeUpgradeMode").value = cfg.mode; if ($("forgeSuccessChance")) $("forgeSuccessChance").value = cfg.successChance; if ($("forgeDestroyFrom")) $("forgeDestroyFrom").value = cfg.destroyFrom; }
export function saveForgeConfig() { const npcId = $("forgeNpcSelect")?.value; if (!npcId) return alert("강화/수리 NPC를 먼저 선택하세요."); data.forges ??= {}; const prev = data.forges[npcId] || {}; data.forges[npcId] = normalizeForgeConfig({ image: appState.tempForgeImage || prev.image || "", intro: $("forgeIntro")?.value || "", upgradePrice: Number($("forgeUpgradePrice")?.value || 0), repairPrice: Number($("forgeRepairPrice")?.value || 0), mode: $("forgeUpgradeMode")?.value || "chance", successChance: Number($("forgeSuccessChance")?.value || 70), destroyFrom: Number($("forgeDestroyFrom")?.value || 8) }); appState.tempForgeImage = ""; save(); renderForgeConfigList(); renderInlineForgeForCurrentCharacter(); showToast("대장간 설정 저장 완료"); }
export function renderForgeConfigList() { const box = $("forgeConfigList"); if (!box) return; const ids = Object.keys(data.forges || {}); box.innerHTML = ids.map(id => { const npc = data.npcs.find(n => n.id === id); const cfg = getForgeConfig(id); return '<div class="list-item"><div class="row-title">' + esc(npc?.name || "대장간") + '</div><div class="row-meta">강화 ' + cfg.upgradePrice + ' Gold / 수리 1당 ' + cfg.repairPrice + ' Gold / ' + (cfg.mode === "timing" ? "타이밍" : "단순확률") + ' / 파괴 ' + cfg.destroyFrom + '강부터</div></div>'; }).join("") || '<p class="muted">저장된 대장간 설정이 없습니다.</p>'; }
export function getForgeTargetPlayer() { return data.players.find(p => p.id === data.playerSession?.currentPlayerId) || data.players[0] || null; }
export function getVisibleForgeIdForPlayer() { const active = data.activeNpcIds || []; return active.find(id => isForgeNpc(data.npcs.find(n => n.id === id))) || ""; }
export function getOwnedEquipment(player, weaponOnly = false) { if (!player) return []; return data.equipments.filter(eq => { const mine = eq.owner === player.name || eq.equippedBy === player.name || (!eq.owner && !eq.equippedBy); return mine && (!weaponOnly || eq.type === "weapon"); }); }
export function openMainSceneForge(npcId) { const npc = data.npcs.find(n => n.id === npcId); if (!npc) return alert("대장간 NPC를 찾을 수 없습니다."); appState.currentForgeState = { npcId, tab: "enhance", selectedEquipmentId: "", listOpen: false, surface: "main" }; renderForgeSurface(npcId, "main"); $("mainSceneForgePanel")?.classList.remove("hidden"); showToast((npc.name || "대장간") + " 대장간을 열었습니다."); }
export function closeMainSceneForge() { $("mainSceneForgePanel")?.classList.add("hidden"); }
export function renderInlineForgeForCurrentCharacter() { const player = data.players.find(p => p.id === data.playerSession.currentPlayerId); const panel = $("playerInlineForgePanel"); if (!panel) return; const npcId = getVisibleForgeIdForPlayer(); if (!player || !npcId) { panel.classList.add("hidden"); return; } if (appState.currentForgeState.surface !== "player" || appState.currentForgeState.npcId !== npcId) { appState.currentForgeState = { npcId, tab: "enhance", selectedEquipmentId: "", listOpen: false, surface: "player" }; } renderForgeSurface(npcId, "player"); panel.classList.remove("hidden"); }
export function renderForgeSurface(npcId, surface) { const npc = data.npcs.find(n => n.id === npcId); const cfg = getForgeConfig(npcId); const title = surface === "player" ? $("playerForgeTitle") : $("mainSceneForgeTitle"); const intro = surface === "player" ? $("playerForgeIntro") : $("mainSceneForgeIntro"); if (title) title.textContent = (npc?.name || "대장간") + "의 대장간"; if (intro) intro.textContent = cfg.intro || "강화와 수리를 진행할 수 있습니다."; if (surface === "main") { const bg = $("mainSceneForgeBg"); if (bg) { if (cfg.image) { bg.classList.remove("no-image"); bg.style.backgroundImage = "url('" + cfg.image + "')"; } else { bg.classList.add("no-image"); bg.style.backgroundImage = ""; } } } else { const imgBox = $("playerForgeImageBox"); if (imgBox) { if (cfg.image) { imgBox.style.display = "block"; imgBox.innerHTML = '<img src="' + cfg.image + '">'; } else { imgBox.style.display = "none"; imgBox.innerHTML = ""; } } } renderForgeContent(npcId, surface); }
export function renderForgeContent(npcId, surface) { const box = surface === "player" ? $("playerForgeContent") : $("mainSceneForgeContentBox"); if (!box) return; const player = getForgeTargetPlayer(); if (!player) { box.innerHTML = '<p class="muted">강화/수리 대상 캐릭터를 먼저 선택하세요.</p>'; return; } const tab = appState.currentForgeState.tab || "enhance"; box.innerHTML = '<div class="forge-tabs"><button class="' + (tab === "enhance" ? "active" : "") + '" data-action="set-forge-tab" data-npc-id="' + npcId + '" data-tab="enhance" data-surface="' + surface + '">강화</button><button class="' + (tab === "repair" ? "active" : "") + '" data-action="set-forge-tab" data-npc-id="' + npcId + '" data-tab="repair" data-surface="' + surface + '">수리</button></div>' + (tab === "repair" ? renderForgeRepairTab(player, npcId, surface) : renderForgeEnhanceTab(player, npcId, surface)); }
export function renderForgeEnhanceTab(player, npcId, surface) { const cfg = getForgeConfig(npcId); const weapons = getOwnedEquipment(player, true); const selected = weapons.find(e => e.id === appState.currentForgeState.selectedEquipmentId); const list = appState.currentForgeState.listOpen ? '<div class="forge-equipment-list">' + (weapons.map(eq => '<button data-action="select-forge-equipment" data-npc-id="' + npcId + '" data-eq-id="' + eq.id + '" data-surface="' + surface + '">' + esc(eq.name) + ' +' + (eq.upgradeLevel || 0) + ' / 내구도 ' + eq.durability + '/' + eq.maxDurability + '</button>').join("") || '<p class="muted">소유한 무기가 없습니다.</p>') + '</div>' : ""; const timing = cfg.mode === "timing" ? '<div class="forge-timing-wrap"><div class="forge-timing-bar ' + (Number(selected?.upgradeLevel || 0) >= cfg.destroyFrom ? "danger-live" : "") + '"><span class="destroy-zone left"></span><span class="success-zone">+2</span><span class="destroy-zone right"></span><span class="timing-pointer"></span></div><div class="row-meta">타이밍 방식: 중앙 금색 영역은 +2강, 붉은 영역은 ' + cfg.destroyFrom + '강 이상부터 파괴입니다.</div></div>' : '<div class="row-meta">단순확률 방식: 성공률 ' + cfg.successChance + '% / 성공 시 +1강</div>'; const slot = selected ? (selected.image ? '<img src="' + selected.image + '">' : "") + '<strong>' + esc(selected.name) + '</strong><span>+' + (selected.upgradeLevel || 0) + '</span>' : '<strong>강화할 무기 선택</strong><span>클릭해서 목록 열기</span>'; return '<div class="forge-workbench"><button class="forge-equipment-slot" data-action="toggle-forge-equipment-list" data-npc-id="' + npcId + '" data-surface="' + surface + '">' + slot + '</button>' + list + timing + '<button class="forge-primary-btn" ' + (selected ? "" : "disabled") + ' data-action="run-forge-enhance" data-npc-id="' + npcId + '" data-surface="' + surface + '">강화 시작 (' + cfg.upgradePrice + ' Gold)</button></div>'; }
export function renderForgeRepairTab(player, npcId, surface) { const cfg = getForgeConfig(npcId); const items = getOwnedEquipment(player, false); return '<div class="forge-equipment-list forge-repair-list">' + (items.map(eq => { const missing = Math.max(0, Number(eq.maxDurability || 0) - Number(eq.durability || 0)); const cost = missing * Number(cfg.repairPrice || 0); const img = eq.image ? '<img src="' + eq.image + '">' : '<div class="shop-goods-thumb-placeholder">NO<br>IMG</div>'; return '<div class="forge-repair-row">' + img + '<div><strong>' + esc(eq.name) + ' +' + (eq.upgradeLevel || 0) + '</strong><div class="row-meta">내구도 ' + eq.durability + '/' + eq.maxDurability + ' / 수리비 ' + cost + ' Gold</div></div><button ' + (missing > 0 ? "" : "disabled") + ' data-action="repair-forge-equipment" data-npc-id="' + npcId + '" data-eq-id="' + eq.id + '" data-surface="' + surface + '">수리</button></div>'; }).join("") || '<p class="muted">수리할 장비가 없습니다.</p>') + '</div>'; }
export function setForgeTab(npcId, tab, surface) { appState.currentForgeState = { ...appState.currentForgeState, npcId, tab, listOpen: false, surface }; renderForgeSurface(npcId, surface); }
export function toggleForgeEquipmentList(npcId, surface) { appState.currentForgeState = { ...appState.currentForgeState, npcId, surface, listOpen: !appState.currentForgeState.listOpen }; renderForgeSurface(npcId, surface); }
export function selectForgeEquipment(npcId, equipmentId, surface) { appState.currentForgeState = { ...appState.currentForgeState, npcId, surface, selectedEquipmentId: equipmentId, listOpen: false }; renderForgeSurface(npcId, surface); }
export function addForgeUpgrade(eq, gain) { eq.stats = baseStats(eq.stats); eq.upgradeLevel = Number(eq.upgradeLevel || 0) + gain; COMMON_STATS.forEach(stat => eq.stats[stat] = Number(eq.stats[stat] || 0) + gain); eq.maxDurability = Number(eq.maxDurability || eq.durability || 10) + gain; eq.durability = Math.min(eq.maxDurability, Number(eq.durability || 0) + gain); }
export function runForgeEnhance(npcId, surface) { const player = getForgeTargetPlayer(); const cfg = getForgeConfig(npcId); const eq = data.equipments.find(e => e.id === appState.currentForgeState.selectedEquipmentId); if (!player || !eq) return alert("강화할 무기를 선택하세요."); if (Number(player.gold || 0) < Number(cfg.upgradePrice || 0)) return alert("강화 실패: 골드가 부족합니다."); player.gold -= Number(cfg.upgradePrice || 0); if (cfg.mode === "timing") { const pos = (Date.now() % 2200) / 22; const level = Number(eq.upgradeLevel || 0); const destroyLive = level >= Number(cfg.destroyFrom || 0); if (destroyLive && ((pos >= 37 && pos <= 44) || (pos >= 56 && pos <= 63))) { data.equipments = data.equipments.filter(e => e.id !== eq.id); appState.currentForgeState.selectedEquipmentId = ""; addLog(player.name + "의 " + eq.name + " 강화 실패: 파괴"); save(); renderAll(); renderForgeSurface(npcId, surface); alert("붉은 파괴 구간에 닿아 장비가 파괴되었습니다."); return; } const gain = (pos >= 47 && pos <= 53) ? 2 : 1; addForgeUpgrade(eq, gain); addLog(player.name + "의 " + eq.name + " 타이밍 강화 +" + gain); showToast(eq.name + " +" + gain + "강 성공"); } else { const ok = Math.random() * 100 < Number(cfg.successChance || 0); if (ok) { addForgeUpgrade(eq, 1); addLog(player.name + "의 " + eq.name + " 강화 성공"); showToast(eq.name + " 강화 성공"); } else { addLog(player.name + "의 " + eq.name + " 강화 실패"); alert("강화에 실패했습니다. 골드는 소모되었습니다."); } } save(); renderAll(); renderForgeSurface(npcId, surface); }
export function repairForgeEquipment(npcId, equipmentId, surface) { const player = getForgeTargetPlayer(); const cfg = getForgeConfig(npcId); const eq = data.equipments.find(e => e.id === equipmentId); if (!player || !eq) return; const missing = Math.max(0, Number(eq.maxDurability || 0) - Number(eq.durability || 0)); const cost = missing * Number(cfg.repairPrice || 0); if (missing <= 0) return alert("이미 완전히 수리되어 있습니다."); if (Number(player.gold || 0) < cost) return alert("수리 실패: 골드가 부족합니다."); if (!confirm(cost + "골드로 " + eq.name + "을(를) 수리하시겠습니까?")) return; player.gold -= cost; eq.durability = eq.maxDurability; addLog(player.name + "의 " + eq.name + " 수리 완료"); save(); renderAll(); renderForgeSurface(npcId, surface); showToast("수리 완료"); }


export function openPlayerShop() {
  const current = data.players.find(p => p.id === data.playerSession.currentPlayerId);
  const npc = data.npcs.find(n => n.id === $("playerMerchantSelect")?.value);
  if (!current) return alert("캐릭터에 접속해주세요.");
  if (!npc) return alert("상인을 선택하세요.");
  $("playerShopTitle").textContent = `${npc.name}의 상점`;
  renderPlayerShopGoods(current, npc.id);
  $("playerShopModal")?.classList.remove("hidden");
}

export function renderPlayerShopGoods(player, npcId) {
  const box = $("playerShopGoodsList");
  if (!box) return;
  const goodsList = data.creation.merchantShops.filter(g => g.npcId === npcId);
  if (!goodsList.length) {
    box.innerHTML = `<p class="muted">판매 목록이 없습니다.</p>`;
    return;
  }
  box.innerHTML = goodsList.map(g => {
    const goods = getMerchantGoods(g.type, g.goodsId);
    if (!goods) return "";
    const price = Number(g.price || 0);
    const enough = Number(player.gold || 0) >= price;
    const inStock = g.stock === null || Number(g.stock) > 0;
    const canBuy = inStock;
    const img = getGoodsImage(goods, g.type);
    const desc = getGoodsDesc(goods, g.type);
    const stats = getGoodsStatsText(goods, g.type);
    return `<div class="shop-goods-row">
      ${img ? `<img src="${img}">` : `<div class="shop-goods-image-placeholder">NO IMAGE</div>`}
      <div>
        <div class="shop-goods-title">${esc(goods.name || "?")}</div>
        <div class="shop-goods-desc">${esc(desc || "")}</div>
        <div class="shop-goods-stats">${stats}</div>
      </div>
      <div class="shop-price-box">
        <div class="shop-price ${enough ? "" : "not-enough"}">${price} Gold</div>
        <div class="shop-stock">재고 ${g.stock ?? "무제한"}</div>
        <button class="shop-buy-btn" ${canBuy ? "" : "disabled"} data-action="buy-from-merchant" data-id="${g.id}">구매</button>
      </div>
    </div>`;
  }).join("");
}

export function buyFromMerchant(shopId) {
  const player = data.players.find(p => p.id === data.playerSession.currentPlayerId);
  const g = data.creation.merchantShops.find(x => x.id === shopId);
  if (!player || !g) return;
  const goods = getMerchantGoods(g.type, g.goodsId);
  if (!goods) return;
  const price = Number(g.price || 0);
  if (!confirm(`${price}골드로 ${goods.name}을(를) 구매하시겠습니까?`)) return;
  if (Number(player.gold || 0) < price) return alert("구매 실패: 골드가 부족합니다.");
  if (g.stock !== null && Number(g.stock) <= 0) return alert("구매 실패: 재고가 없습니다.");
  player.gold -= price;
  if (g.stock !== null) g.stock--;
  if (g.type === "item") {
    data.items.push({ ...structuredClone(goods), id: makeId(), owner: player.name, used: false });
  } else if (g.type === "equipment") {
    data.equipments.push({ ...structuredClone(goods), id: makeId(), owner: player.name, equippedBy: "" });
  } else if (g.type === "skill") {
    data.skills.push({ ...structuredClone(goods), id: makeId(), ownerType: "player", ownerId: player.id, forSale: false });
  }
  save();
  showToast(`${goods.name} 구매 완료`);
  renderAll();
  renderInlineShopForCurrentCharacter();
}

export function getMerchantGoods(type, id) {
  return (type === "item" ? data.items : type === "equipment" ? data.equipments : data.skills).find(x => x.id === id);
}

export function merchantTypeName(type) {
  return { item: "아이템", equipment: "장비", skill: "스킬" }[type] || type;
}

export function getGoodsImage(goods, type) {
  if (!goods) return "";
  return goods.image || goods.portrait || "";
}

export function getGoodsDesc(goods, type) {
  if (!goods) return "";
  return goods.desc || goods.memo || goods.skillMemo || "";
}

export function getGoodsStatsText(goods, type) {
  if (!goods) return "";
  const statText = goods.stats ? COMMON_STATS.filter(s => Number(goods.stats[s] || 0) !== 0).map(s => `${STAT_LABELS[s]} ${goods.stats[s] > 0 ? "+" : ""}${goods.stats[s]}`).join(" / ") : "";
  if (type === "equipment") {
    const res = goods.resists ? `내성 참격 ${goods.resists.slash || 0} / 관통 ${goods.resists.pierce || 0} / 타격 ${goods.resists.blunt || 0} / 특수 ${goods.resists.special || 0}` : "";
    return [statText, res, goods.attackType ? `공격유형 ${attackTypeName(goods.attackType)}` : ""].filter(Boolean).join("<br>");
  }
  if (type === "skill") {
    return `${skillName(goods.type)} / ${STAT_LABELS[goods.stat] || goods.stat} / MP ${goods.mpCost || 0}`;
  }
  return statText || "추가 능력치 없음";
}

// 기존 player view 렌더에 현재 캐릭터 포털 추가
export function exportData() { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "trpg-dashboard-backup-v13.json"; a.click(); URL.revokeObjectURL(url); }
export function importData(e) { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = ev => { try { const parsed = JSON.parse(ev.target.result); normalize(parsed); Object.assign(data, parsed); save(); renderAll(); alert("불러오기 완료"); } catch { alert("불러오기 실패"); } }; r.readAsText(file); }
export function addLog(text) { data.diceLog.unshift(String(text)); data.diceLog = data.diceLog.slice(0, 300); save(); renderLog(); }
export function renderLog() { const box = $("diceLog"); if (!box) return; box.innerHTML = ""; data.diceLog.forEach(l => { const li = document.createElement("li"); li.textContent = l; box.appendChild(li); }); }
export function getAllActors() { return [...data.players.map(p => ({ type: "player", id: p.id, name: p.name, actor: p })), ...data.npcs.map(n => ({ type: "npc", id: n.id, name: n.name, actor: n })), ...data.bosses.map(b => ({ type: "boss", id: b.id, name: b.name, actor: b }))]; }
export function actorValue(type, id) { return `${type}:${id}`; }
export function findActor(v) { const [type, id] = String(v || "").split(":"); const arr = type === "player" ? data.players : type === "npc" ? data.npcs : data.bosses; const actor = arr.find(x => x.id === id); return actor ? { type, id, actor } : null; }
export function getPercent(cur, max) { if (!max) return 0; return Math.max(0, Math.min(100, Math.round((cur / max) * 100))); }
export function esc(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
export function escAttr(v) { return String(v ?? "").replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll('"', "&quot;"); }
export function typeName(t) { return { player: "플레이어", npc: "NPC", boss: "보스" }[t] || t; }
export function jobTitle(j) { return { merchant: "상인", enchanter: "인첸트", repair: "강화/수리", quest: "퀘스트수주", god: "신" }[j] || j || "상인"; }
export function skillName(t) { return { check: "일반 판정", damage: "피해", heal: "회복", status: "상태이상", cleanse: "해제" }[t] || t; }
export function effectName(t) { return { dot: "턴 피해", hot: "턴 회복", shield: "보호막", statUp: "능력치 증가", statDown: "능력치 감소", maxHpDown: "최대체력 감소" }[t] || t; }
export function fumbleName(t) { return { weaponDurability: "무기 내구도", armorDurability: "방어구 내구도", allyDamage: "아군 피해", statDown: "스탯 감소", weaponDisabled: "무기 사용불가", hpDown: "체력 감소", maxHpDown: "최대체력 감소" }[t] || t; }
export function attackTypeName(t) { return { slash: "참격", pierce: "관통", blunt: "타격", special: "특수" }[t] || t || "참격"; }
export function shopTypeName(t) { return { item: "아이템", equipment: "장비", skill: "스킬" }[t] || t; }
export function worldEventName(t) { return { condition: "전체 상태이상", damage: "전체 피해", heal: "전체 회복", weather: "날씨 변경", time: "시간 변경", faction: "세력 평판 변화" }[t] || t; }
export function updateHudBar() {
  if (!$("hudTurn")) return;
  $("hudTurn").textContent = `ROUND ${data.round || 1} / TURN ${(data.currentTurn || 0) + 1}`;
  $("hudWeather").textContent = `날씨 ${data.worldState?.weather || "-"}`;
  $("hudTime").textContent = `시간 ${data.worldState?.time || "-"}`;
}

