import { actorValue, addLog, addMerchantShopGoods, attackTypeName, closeMainSceneShop, createPlayerFromPortal, esc, escAttr, fillMerchantGoodsSelect, findActor, getPercent, jobTitle, leavePlayerCharacter, openMainSceneShop, renderCreationClassDesc, renderCreationClassSelect, renderCreationStatsGrid, renderInlineForgeForCurrentCharacter, renderInlineShopForCurrentCharacter, renderMerchantShopLookForm, renderMerchantShopSetup, renderPlayerPortal, rollClassDice, rollCreationStats, saveMerchantShopLook, shopTypeName, typeName, worldEventName } from "./creation.js";
import { clearInputs, clearStats, pushScene, readImage, readStats, renderAll, renderList, renderMapView } from "./rendering.js";
import { appState, $, COMMON_STATS, STAT_LABELS, data } from "./constants_data.js";
import { init, makeId, normalize, save } from "./main.js";

export function rollD20() { const mod = Number($("modifierInput").value || 0); const dice = Math.floor(Math.random() * 20) + 1; const total = dice + mod; $("checkDiceInput").value = dice; $("diceResult").classList.remove("critical", "fumble"); let text = `d20(${dice}) + 보정(${mod}) = ${total}`; if (dice === 20) { text += "\n크리티컬!"; $("diceResult").classList.add("critical"); } if (dice === 1) { text += "\n펌블!"; $("diceResult").classList.add("fumble"); triggerFumble(); } $("diceResult").textContent = text; addLog(text); }
export function triggerFumble() { const actor = findActor($("checkActorSelect").value); const target = findActor($("checkTargetSelect").value); if (!actor) return; const boss = target?.type === "boss" ? target.actor : data.activeBossIds.map(id => data.bosses.find(b => b.id === id)).find(Boolean); const fIds = boss?.fumbleIds || []; if (!fIds.length) return addLog("펌블: 적용할 보스 펌블 효과 없음"); const f = data.fumbles.find(x => x.id === fIds[Math.floor(Math.random() * fIds.length)]); if (f) applyFumble(actor.actor, f); }
export function applyFumble(actor, f) { let log = `펌블 효과 [${f.name}] → ${actor.name}: `; if (f.type === "weaponDurability") changeDurability(actor.name, "weapon", f.value); if (f.type === "armorDurability") ["helmet", "armor", "gloves", "boots"].forEach(s => changeDurability(actor.name, s, f.value)); if (f.type === "allyDamage") { const p = data.players[0]; if (p) { p.hp = Math.max(0, p.hp - Math.abs(f.value)); log += `${p.name} 피해 ${Math.abs(f.value)}`; } } if (f.type === "statDown") { applyCondition(actor, { id: makeId(), name: f.name, stat: f.stat, effect: "statDown", value: Math.abs(f.value), duration: f.duration }, f.duration); } if (f.type === "weaponDisabled") { actor.disabledWeaponTurns = Math.max(actor.disabledWeaponTurns || 0, f.duration); log += `무기 사용불가 ${f.duration}턴`; } if (f.type === "hpDown") { actor.hp = Math.max(0, actor.hp - Math.abs(f.value)); log += `HP ${Math.abs(f.value)} 감소`; } if (f.type === "maxHpDown") { actor.maxHp = Math.max(1, actor.maxHp - Math.abs(f.value)); actor.hp = Math.min(actor.hp, actor.maxHp); log += `최대 HP ${Math.abs(f.value)} 감소`; } addLog(log); save(); renderAll(); }
export function changeDurability(owner, slot, delta) { const eq = data.equipments.find(e => e.equippedBy === owner && e.type === slot); if (eq) eq.durability = Math.max(0, Math.min(eq.maxDurability, eq.durability + delta)); }

export function runSkillCheck() { const source = findActor($("checkActorSelect").value), target = findActor($("checkTargetSelect").value); if (!source || !target) return alert("시전자/대상자 확인"); const type = $("skillSelect").value, stat = $("checkStatSelect").value, attackType = $("attackTypeSelect")?.value || getAttackTypeFromActor(source), dice = Number($("checkDiceInput").value || 0), bonus = Number($("checkBonusInput").value || 0), hypeUse = Number($("hypeUseInput").value || 0); const val = effStat(source.actor, stat); if (hypeUse > 0) { if (source.type !== "player") return alert("고양감은 플레이어만 사용할 수 있습니다."); if ((source.actor.hype || 0) < hypeUse) return alert("고양감 부족"); source.actor.hype -= hypeUse; } const total = dice + val + bonus + hypeUse; const rawAmount = $("effectAmountInput").value === "" ? total : Number($("effectAmountInput").value); const baseDefense = type === "damage" ? Number(target.actor.def || 0) : 0; const resistDefense = type === "damage" ? getResistanceDefense(target.actor, attackType) : 0; const defense = baseDefense + resistDefense; const amount = type === "damage" ? Math.max(0, rawAmount - defense) : rawAmount; let result = `${source.actor.name} → ${target.actor.name}\n공격유형: ${attackTypeName(attackType)}\n${dice}+${STAT_LABELS[stat]}(${val})+보정(${bonus})+고양감(${hypeUse}) = ${total}`; const skill = data.skills.find(s => s.id === $("runtimeSkillSelect").value); if (skill && source.actor.mp !== undefined) { if (source.actor.mp < skill.mpCost) return alert("MP 부족"); source.actor.mp -= skill.mpCost; result += `\nMP ${skill.mpCost} 소모`; } if (type === "damage") { const beforeHp = Number(target.actor.hp || 0); const blocked = damage(target.actor, amount); if (Number(target.actor.hp || 0) === beforeHp && amount > blocked) { target.actor.hp = Math.max(0, beforeHp - Math.max(0, amount - blocked)); } result += `\n기본 피해 ${rawAmount} - 기본방어 ${baseDefense} - ${attackTypeName(attackType)} 내성 ${resistDefense} = ${amount}\n최종 피해 ${Math.max(0, amount - blocked)} / 보호막 ${blocked} 흡수`; damageEquipment(source.actor.name, "weapon", -1); damageArmorByAttack(target.actor.name, attackType, -1); } if (type === "heal") { target.actor.hp = Math.min(target.actor.maxHp, target.actor.hp + amount); result += `\n회복 ${amount}`; } if (type === "status") { const c = data.conditions.find(x => x.id === $("runtimeConditionSelect").value); if (c) { applyCondition(target.actor, c, c.duration); result += `\n${c.name} 적용`; } } if (type === "cleanse") { target.actor.conditions = []; target.actor.status = "정상"; result += "\n상태이상 해제"; } $("statCheckResult").textContent = result; addLog(result); $("hypeUseInput").value = ""; save(); renderAll(); }
export function damage(actor, amount) {
  let dmg = Math.max(0, Number(amount || 0));
  let blocked = 0;
  actor.conditions = actor.conditions || [];
  actor.conditions.forEach(c => {
    if (c.effect === "shield" && dmg > 0) {
      const b = Math.min(Number(c.remainingShield || 0), dmg);
      c.remainingShield = Number(c.remainingShield || 0) - b;
      dmg -= b;
      blocked += b;
    }
  });
  actor.conditions = actor.conditions.filter(c => c.effect !== "shield" || Number(c.remainingShield || 0) > 0);
  actor.hp = Math.max(0, Number(actor.hp || 0) - dmg);
  syncStatus(actor);
  return blocked;
}
export function damageEquipment(owner, slot, delta) { changeDurability(owner, slot, delta); }
export function damageArmorByAttack(owner, attackType, delta) { ["helmet", "armor", "gloves", "boots"].forEach(slot => { const eq = data.equipments.find(e => e.equippedBy === owner && e.type === slot); if (eq && Number(eq.resists?.[attackType] || 0) > 0) { eq.durability = Math.max(0, Math.min(eq.maxDurability, eq.durability + delta)); } }); }
export function getAttackTypeFromActor(info) { if (!info) return "slash"; if (info.type === "boss") return info.actor.attackType || "slash"; if (info.type === "player") { const weapon = data.equipments.find(e => e.equippedBy === info.actor.name && e.type === "weapon"); return weapon?.attackType || "slash"; } return info.actor.attackType || "slash"; }
export function autoAttackTypeFromActor() { const info = findActor($("checkActorSelect")?.value); const sel = $("attackTypeSelect"); if (info && sel) sel.value = getAttackTypeFromActor(info); }
export function getResistanceDefense(actor, attackType) { if (!actor?.name) return 0; return data.equipments.filter(e => e.equippedBy === actor.name && e.type !== "weapon").reduce((sum, e) => sum + Number(e.resists?.[attackType] || 0), 0); }
export function resistText(e) { const r = e.resists || {}; return `<span class="resist-line">참격 ${r.slash || 0} / 관통 ${r.pierce || 0} / 타격 ${r.blunt || 0} / 특수 ${r.special || 0}</span>`; }

export function renderRuntimeSkillSelect() { const sel = $("runtimeSkillSelect"); if (!sel) return; const actor = $("checkActorSelect").value; sel.innerHTML = `<option value="">직접 설정</option>`; data.skills.filter(s => actorValue(s.ownerType, s.ownerId) === actor).forEach(s => sel.add(new Option(s.name, s.id))); autoAttackTypeFromActor(); }
export function applyRuntimeSkill() { const s = data.skills.find(x => x.id === $("runtimeSkillSelect").value); if (!s) return; $("skillSelect").value = s.type; $("checkStatSelect").value = s.stat; $("effectAmountInput").value = s.amount; $("runtimeConditionSelect").value = s.conditionId || ""; $("checkBonusInput").value = Number(s.bonus || 0); }

export function addTurn() { const a = findActor($("turnActorSelect").value); if (!a) return; data.turns.push({ id: makeId(), type: a.type, actorId: a.id, name: a.actor.name, init: Number($("turnInitInput").value || 0) }); data.turns.sort((x, y) => y.init - x.init); data.currentTurn = 0; save(); renderTurns(); }
export function nextTurn() { if (!data.turns.length) return; data.currentTurn = (data.currentTurn + 1) % data.turns.length; data.round++; data.worldState.turn++; const a = findActor(actorValue(data.turns[data.currentTurn].type, data.turns[data.currentTurn].actorId)); if (a) processTicks(a.actor); processMapEffects(); processWorldEvents(); save(); renderAll(); }
export function renderTurns() { const box = $("turnList"); if (!box) return; box.innerHTML = ""; data.turns.forEach((t, i) => { const li = document.createElement("li"); if (i === data.currentTurn) li.classList.add("active"); li.innerHTML = `<strong>${esc(t.name)}</strong> / ${typeName(t.type)} / 선공 ${t.init}`; box.appendChild(li); }); }
export function processTicks(actor) { (actor.conditions || []).forEach(c => { if (c.effect === "dot") { damage(actor, c.value); addLog(`${actor.name} ${c.name}: 턴 피해 ${c.value}`); } if (c.effect === "hot") { actor.hp = Math.min(actor.maxHp, actor.hp + c.value); addLog(`${actor.name} ${c.name}: 턴 회복 ${c.value}`); } c.duration--; }); actor.conditions = (actor.conditions || []).filter(c => c.duration > 0 && (c.effect !== "shield" || c.remainingShield > 0)); if (actor.disabledWeaponTurns > 0) actor.disabledWeaponTurns--; syncStatus(actor); }
export function processMapEffects() { const m = data.maps.find(x => x.id === data.activeMapId); if (!m) return; (m.effects || []).forEach(e => { if (data.round % e.everyTurns === 0) { const c = data.conditions.find(x => x.id === e.conditionId); if (c) data.players.forEach(p => { applyCondition(p, c, e.duration); addLog(`맵 효과 ${m.name}: ${p.name}에게 ${c.name} 적용`); }); } }); }
export function applyCondition(actor, template, duration) { actor.conditions ??= []; const c = { id: makeId(), templateId: template.id, name: template.name, stat: template.stat, effect: template.effect, value: Number(template.value || 0), duration: Number(duration || template.duration || 1), remainingShield: template.effect === "shield" ? Number(template.value || 0) : 0, desc: template.desc || "" }; actor.conditions.push(c); syncStatus(actor); }
export function syncStatus(actor) { actor.status = (actor.conditions || []).length ? actor.conditions.map(c => c.name).join(", ") : "정상"; }
export function effStat(actor, stat) { let v = Number(actor.stats?.[stat] || 0); data.equipments.filter(e => e.equippedBy === actor.name).forEach(e => { v += Number(e.stats?.[stat] || 0); const m = data.materials.find(x => x.id === e.materialId); if (m) v += Number(m.stats?.[stat] || 0); const ench = data.enchants.find(x => x.id === e.enchantId); if (ench) v += Number(ench.stats?.[stat] || 0); }); (actor.conditions || []).forEach(c => { if (c.stat === stat && c.effect === "statUp") v += c.value; if (c.stat === stat && c.effect === "statDown") v -= c.value; }); return v; }

export function loadMapImageToView(src) { pushScene(src); save(); renderMapView(); }
export function endCombat() { if (!confirm("전투 종료? 턴과 보스 표시를 초기화합니다.")) return; data.turns = []; data.currentTurn = 0; data.activeBossIds = []; save(); renderAll(); }
export function giveReward(player, reward, reason) { reward ??= {}; addExp(player, Number(reward.exp || 0)); player.gold += Number(reward.gold || 0); if (reward.itemName) { data.items.push({ id: makeId(), name: reward.itemName, qty: Number(reward.itemQty || 1), owner: player.name, desc: reward.itemDesc || "", effect: "none", effectAmount: 0, conditionId: "", used: false }); } addLog(`${reason} → ${player.name}: EXP ${reward.exp || 0}, Gold ${reward.gold || 0}`); save(); renderAll(); }
export function addExp(p, amount) { p.exp += amount; while (p.exp >= p.nextExp) { p.exp -= p.nextExp; p.level++; p.statPoints++; p.nextExp = Math.ceil(p.nextExp * 1.5); addLog(`${p.name} 레벨업! Lv.${p.level}, 스탯 포인트 +1`); } }


export function fillShopSelects() {
  const npcSel = $("shopNpcSelect"); if (npcSel) { npcSel.innerHTML = ""; data.npcs.filter(n => n.job === "merchant" || n.job === "enchanter" || n.job === "repair" || n.job === "god").forEach(n => npcSel.add(new Option(`${n.name} / ${jobTitle(n.job)}`, n.id))); }
  fillShopGoodsSelect();
}
export function fillShopGoodsSelect() {
  const s = $("shopGoodsSelect"); if (!s) return; s.innerHTML = "";
  const type = $("shopGoodsType")?.value || "item";
  const arr = type === "item" ? data.items : type === "equipment" ? data.equipments : data.skills.filter(sk => sk.forSale || sk.ownerType === "none");
  arr.forEach(x => s.add(new Option(x.name, x.id)));
}
export function addShopGoods() {
  const npcId = $("shopNpcSelect").value, type = $("shopGoodsType").value, goodsId = $("shopGoodsSelect").value;
  if (!npcId || !goodsId) return alert("NPC와 상품을 선택하세요.");
  data.shops.push({ id: makeId(), npcId, type, goodsId, price: Number($("shopGoodsPrice").value || 0), stock: $("shopGoodsStock").value === "" ? null : Number($("shopGoodsStock").value) });
  clearInputs(["shopGoodsPrice", "shopGoodsStock"]); save(); renderAll();
}
export function renderShopList() {
  const box = $("shopList"); if (!box) return; box.innerHTML = "";
  data.shops.forEach(g => {
    const npc = data.npcs.find(n => n.id === g.npcId);
    const goods = getGoods(g.type, g.goodsId);
    box.insertAdjacentHTML("beforeend", `<div class="list-item"><div class="row-title">${esc(goods?.name || "?")}</div><div class="row-meta">${esc(npc?.name || "?")} / ${shopTypeName(g.type)} / ${g.price} Gold / 재고 ${g.stock ?? "무제한"}</div><button class="small danger" data-action="delete-shop-goods" data-id="${g.id}">삭제</button></div>`);
  });
}
export function deleteShopGoods(id) { data.shops = data.shops.filter(s => s.id !== id); save(); renderAll(); }

export function addUpgradeRule() {
  data.upgradeRules.push({ id: makeId(), level: Number($("upgradeLevel").value || 1), success: Number($("upgradeSuccess").value || 100), cost: Number($("upgradeCost").value || 0), statBonus: Number($("upgradeStatBonus").value || 1), durabilityPenalty: Number($("upgradeDurabilityPenalty").value || 0), breakable: $("upgradeBreakable").checked });
  clearInputs(["upgradeLevel", "upgradeSuccess", "upgradeCost", "upgradeStatBonus", "upgradeDurabilityPenalty"]); $("upgradeBreakable").checked = false; save(); renderAll();
}
export function renderUpgradeRuleList() {
  const box = $("upgradeRuleList"); if (!box) return; box.innerHTML = "";
  data.upgradeRules.sort((a, b) => a.level - b.level).forEach(r => box.insertAdjacentHTML("beforeend", `<div class="list-item"><div class="row-title">+${r.level}</div><div class="row-meta">성공 ${r.success}% / 비용 ${r.cost} / 스탯 +${r.statBonus} / 실패 내구도 -${r.durabilityPenalty} ${r.breakable ? "/ 파괴가능" : ""}</div><button class="small danger" data-action="delete-upgrade-rule" data-id="${r.id}">삭제</button></div>`));
}
export function deleteUpgradeRule(id) { data.upgradeRules = data.upgradeRules.filter(r => r.id !== id); save(); renderAll(); }

export function fillWorldEventConditionSelect() { const s = $("worldEventCondition"); if (!s) return; s.innerHTML = `<option value="">상태이상 없음</option>`; data.conditions.forEach(c => s.add(new Option(c.name, c.id))); }
export function addWorldEvent() {
  data.worldEvents.push({ id: makeId(), name: $("worldEventName").value || "월드 이벤트", type: $("worldEventType").value, every: Number($("worldEventEvery").value || 1), value: Number($("worldEventValue").value || 0), conditionId: $("worldEventCondition").value, text: $("worldEventText").value });
  clearInputs(["worldEventName", "worldEventEvery", "worldEventValue", "worldEventText"]); save(); renderAll();
}
export function renderWorldEventList() {
  renderList("worldEventList", data.worldEvents, e => `<div class="list-item"><div class="row-title">${esc(e.name)}</div><div class="row-meta">${worldEventName(e.type)} / ${e.every}턴마다 / ${e.value}</div><button class="small danger" data-action="delete-world-event" data-id="${e.id}">삭제</button></div>`);
}
export function deleteWorldEvent(id) { data.worldEvents = data.worldEvents.filter(e => e.id !== id); save(); renderAll(); }

export function addEncounter() { data.encounters.push({ id: makeId(), name: $("encounterName").value || "랜덤 이벤트", weight: Number($("encounterWeight").value || 1), desc: $("encounterDesc").value }); clearInputs(["encounterName", "encounterWeight", "encounterDesc"]); save(); renderAll(); }
export function renderEncounterList() {
  renderList("encounterList", data.encounters, e => `<div class="list-item"><div class="row-title">${esc(e.name)}</div><div class="row-meta">가중치 ${e.weight}<br>${esc(e.desc || "")}</div><button class="small danger" data-action="delete-encounter" data-id="${e.id}">삭제</button></div>`);
}
export function deleteEncounter(id) { data.encounters = data.encounters.filter(e => e.id !== id); save(); renderAll(); }

export function addFaction() { data.factions.push({ id: makeId(), name: $("factionName").value || "세력", rep: Number($("factionRep").value || 0), desc: $("factionDesc").value }); clearInputs(["factionName", "factionRep", "factionDesc"]); save(); renderAll(); }
export function renderFactionList() {
  renderList("factionList", data.factions, f => `<div class="list-item"><div class="row-title">${esc(f.name)}</div><div class="row-meta">평판 ${f.rep}<br>${esc(f.desc || "")}</div><button class="small danger" data-action="delete-faction" data-id="${f.id}">삭제</button></div>`);
}
export function deleteFaction(id) { data.factions = data.factions.filter(f => f.id !== id); save(); renderAll(); }
export function renderFactionView() { const box = $("factionView"); if (!box) return; box.innerHTML = data.factions.map(f => `<div><strong>${esc(f.name)}</strong>: <span class="${f.rep >= 0 ? "reputation-good" : "reputation-bad"}">${f.rep}</span></div>`).join("") || "-"; }


export function fillTreeSkillSelect() { const s = $("treeSkillSelect"); if (!s) return; s.innerHTML = ""; data.skills.forEach(sk => s.add(new Option(`${sk.name}${sk.ownerType === "none" ? " / 미지급" : ""}`, sk.id))); }
export function addTempTreeSkill() { const id = $("treeSkillSelect").value; if (!id) return; appState.tempTreeSkills.push({ skillId: id, reqLevel: Number($("treeSkillReqLevel").value || 1) }); renderTempTreeSkills(); }
export function renderTempTreeSkills() { const box = $("treeSkillPreview"); if (!box) return; box.innerHTML = ""; appState.tempTreeSkills.forEach((n, i) => { const sk = data.skills.find(s => s.id === n.skillId); box.insertAdjacentHTML("beforeend", `<div class="mini-item">${esc(sk?.name || "?")} / 요구 Lv.${n.reqLevel} <button class="small danger" data-action="remove-temp-tree-skill" data-index="${i}">삭제</button></div>`); }); }
export function removeTempTreeSkill(i) { appState.tempTreeSkills.splice(i, 1); renderTempTreeSkills(); }
export function addSkillTree() { const name = $("treeName").value || "스킬 트리"; data.skillTrees.push({ id: makeId(), name, nodes: structuredClone(appState.tempTreeSkills) }); appState.tempTreeSkills = []; clearInputs(["treeName", "treeSkillReqLevel"]); renderTempTreeSkills(); save(); renderAll(); }
export function renderSkillTreeList() {
  renderList("skillTreeList", data.skillTrees, t => `<div class="list-item"><div class="row-title">${esc(t.name)}</div><div class="row-meta">${t.nodes.length}개 스킬</div><button class="small danger" data-action="delete-skill-tree" data-id="${t.id}">삭제</button></div>`);
}
export function deleteSkillTree(id) { data.skillTrees = data.skillTrees.filter(t => t.id !== id); save(); renderAll(); }

export function saveToSlot() { const name = $("saveSlotName").value.trim(); if (!name) return alert("슬롯 이름을 입력하세요."); data.saveSlots[name] = JSON.parse(JSON.stringify({ ...data, saveSlots: data.saveSlots })); save(); renderSaveSlotList(); }
export function renderSaveSlotList() { const box = $("saveSlotList"); if (!box) return; box.innerHTML = ""; Object.keys(data.saveSlots || {}).forEach(name => box.insertAdjacentHTML("beforeend", `<div class="list-item"><div class="row-title">${esc(name)}</div><button class="small" data-action="load-slot" data-name="${escAttr(name)}">불러오기</button><button class="small danger" data-action="delete-slot" data-name="${escAttr(name)}">삭제</button></div>`)); }
export function loadSlot(name) { if (!confirm(`${name} 슬롯을 불러올까요? 현재 데이터는 덮어씌워집니다.`)) return; const slots = data.saveSlots; Object.assign(data, structuredClone(slots[name])); data.saveSlots = slots; normalize(data); save(); renderAll(); }
export function deleteSlot(name) { delete data.saveSlots[name]; save(); renderSaveSlotList(); }

export function renderWorldState() { const box = $("worldStateView"); if (!box) return; box.innerHTML = `턴 ${data.worldState.turn}<br>날씨: ${esc(data.worldState.weather)}<br>시간: ${esc(data.worldState.time)}<br>월드 이벤트 ${data.worldEvents.length}개`; }
export function advanceWorldEvents() { data.worldState.turn++; processWorldEvents(); save(); renderAll(); }
export function processWorldEvents() {
  data.worldEvents.forEach(e => {
    if (data.worldState.turn % e.every !== 0) return;
    if (e.type === "condition") { const c = data.conditions.find(x => x.id === e.conditionId); if (c) data.players.forEach(p => applyCondition(p, c, c.duration)); addLog(`월드 이벤트 ${e.name}: 상태이상 적용`); }
    if (e.type === "damage") { data.players.forEach(p => p.hp = Math.max(0, p.hp - e.value)); addLog(`월드 이벤트 ${e.name}: 전체 피해 ${e.value}`); }
    if (e.type === "heal") { data.players.forEach(p => p.hp = Math.min(p.maxHp, p.hp + e.value)); addLog(`월드 이벤트 ${e.name}: 전체 회복 ${e.value}`); }
    if (e.type === "weather") { data.worldState.weather = e.text || "변화"; addLog(`날씨 변경: ${data.worldState.weather}`); }
    if (e.type === "time") { data.worldState.time = e.text || "변화"; addLog(`시간 변경: ${data.worldState.time}`); }
    if (e.type === "faction") { const f = data.factions.find(x => x.name === e.text); if (f) { f.rep += e.value; addLog(`세력 ${f.name} 평판 ${e.value > 0 ? "+" : ""}${e.value}`); } }
  });
}
export function rollEncounter() { const total = data.encounters.reduce((s, e) => s + Math.max(1, e.weight || 1), 0); let r = Math.random() * total; let picked = data.encounters[0]; for (const e of data.encounters) { r -= Math.max(1, e.weight || 1); if (r <= 0) { picked = e; break; } } $("encounterResult").textContent = picked ? `${picked.name}\\n${picked.desc}` : "랜덤 이벤트 없음"; if (picked) addLog(`랜덤 이벤트: ${picked.name}`); }

export function fillRuntimeShopSelects() { const npc = $("runtimeShopNpcSelect"), target = $("runtimeShopTarget"), up = $("runtimeUpgradeTarget"); if (npc) { const prev = npc.value; npc.innerHTML = ""; const shopNpcIds = new Set([...data.shops.map(s => s.npcId), ...data.creation.merchantShops.map(s => s.npcId)]); data.npcs.filter(n => shopNpcIds.has(n.id) || n.job === "merchant").forEach(n => npc.add(new Option(n.name, n.id))); if (prev) npc.value = prev; } if (target) { const prev = target.value || data.playerSession.currentPlayerId || ""; target.innerHTML = ""; data.players.forEach(p => target.add(new Option(`${p.name} / ${p.gold} Gold`, p.id))); if (prev) target.value = prev; } if (up) { up.innerHTML = ""; data.equipments.forEach(e => up.add(new Option(`${e.name} +${e.upgradeLevel || 0}`, e.id))); } }
export function openShop() { const npcId = $("runtimeShopNpcSelect").value; const selectedTarget = $("runtimeShopTarget")?.value || data.playerSession.currentPlayerId; const player = data.players.find(p => p.id === selectedTarget); if (!npcId || !player) return alert("상점 NPC와 플레이어를 선택하세요."); data.playerSession.currentPlayerId = player.id; const merchantGoods = data.creation.merchantShops.filter(s => s.npcId === npcId); if (merchantGoods.length) { save(); openMainSceneShop(npcId); return; } const npc = data.npcs.find(n => n.id === npcId); $("shopTitle").textContent = `${npc?.name || "상점"}`; const box = $("shopContent"); box.innerHTML = ""; const goodsList = data.shops.filter(s => s.npcId === npcId); if (!goodsList.length) box.innerHTML = `<p class="muted">상점 상품이 없습니다.</p>`; goodsList.forEach(g => { const goods = getGoods(g.type, g.goodsId); box.insertAdjacentHTML("beforeend", `<div class="shop-good"><strong>${esc(goods?.name || "?")}</strong><p>${shopTypeName(g.type)} / ${g.price} Gold / 재고 ${g.stock ?? "무제한"}</p><button data-action="buy-goods" data-shop-id="${g.id}" data-player-id="${player.id}">구매</button></div>`); }); $("shopModal").classList.remove("hidden"); }
export function buyGoods(shopId, playerId) { const g = data.shops.find(x => x.id === shopId), p = data.players.find(x => x.id === playerId); if (!g || !p) return; const goods = getGoods(g.type, g.goodsId); if (!goods) return alert("상품 없음"); if (!confirm(`${g.price}골드로 ${goods.name}을(를) 구매하시겠습니까?`)) return; if (p.gold < g.price) return alert("구매 실패: 골드가 부족합니다."); if (g.stock !== null && g.stock <= 0) return alert("구매 실패: 재고가 없습니다."); p.gold -= g.price; if (g.stock !== null) g.stock--; if (g.type === "item") { data.items.push({ ...structuredClone(goods), id: makeId(), owner: p.name, used: false }); } if (g.type === "equipment") { data.equipments.push({ ...structuredClone(goods), id: makeId(), owner: p.name, equippedBy: "" }); } if (g.type === "skill") { data.skills.push({ ...structuredClone(goods), id: makeId(), ownerType: "player", ownerId: p.id, forSale: false }); } addLog(`${p.name} 구매: ${goods.name}`); save(); showToast("구매 성공"); renderAll(); openShop(); }
export function openUpgrade() { const eq = data.equipments.find(e => e.id === $("runtimeUpgradeTarget").value); const box = $("upgradeContent"); if (!eq) return alert("장비 선택"); box.innerHTML = `<h3>${esc(eq.name)} +${eq.upgradeLevel || 0}</h3><p>내구도 ${eq.durability}/${eq.maxDurability}</p>`; data.upgradeRules.sort((a, b) => a.level - b.level).forEach(r => box.insertAdjacentHTML("beforeend", `<div class="upgrade-target"><strong>+${r.level}</strong><p>성공 ${r.success}% / 비용 ${r.cost} / 스탯 +${r.statBonus}</p><button data-action="try-upgrade" data-eq-id="${eq.id}" data-rule-id="${r.id}">도전</button></div>`)); $("upgradeModal").classList.remove("hidden"); }
export function tryUpgrade(eqId, ruleId) { const eq = data.equipments.find(e => e.id === eqId), r = data.upgradeRules.find(x => x.id === ruleId); if (!eq || !r) return; const success = Math.random() * 100 < r.success; if (success) { eq.upgradeLevel = r.level; COMMON_STATS.forEach(stat => eq.stats[stat] = Number(eq.stats[stat] || 0) + r.statBonus); addLog(`${eq.name} 강화 성공 +${r.level}`); } else { eq.durability = Math.max(0, eq.durability - r.durabilityPenalty); if (r.breakable && eq.durability <= 0) { data.equipments = data.equipments.filter(e => e.id !== eq.id); addLog(`${eq.name} 강화 실패로 파괴`); } else addLog(`${eq.name} 강화 실패`); } save(); renderAll(); openUpgrade(); }
export function screenEffect(kind) { const el = $("screenEffect"); el.className = `screen-effect ${kind}`; setTimeout(() => el.className = "screen-effect hidden", 1200); }
export function getGoods(type, id) { return (type === "item" ? data.items : type === "equipment" ? data.equipments : data.skills).find(x => x.id === id); }

export function requestMasterAccess() {
  data.access ??= { role: "none", masterPassword: "" };
  if (!data.access.masterPassword) {
    data.access.role = "master";
    data.mode = "master";
    save();
    renderAll();
    showToast("마스터로 접속했습니다.");
    return;
  }
  $("masterLoginPassword").value = "";
  $("masterLoginError").textContent = "";
  $("masterLoginModal")?.classList.remove("hidden");
  setTimeout(() => $("masterLoginPassword")?.focus(), 50);
}

export function confirmMasterLogin() {
  const input = $("masterLoginPassword")?.value || "";
  if (input === data.access.masterPassword) {
    $("masterLoginModal")?.classList.add("hidden");
    data.access.role = "master";
    data.mode = "master";
    save();
    renderAll();
    showToast("마스터로 접속했습니다.");
  } else {
    $("masterLoginError").textContent = "비밀번호가 틀렸습니다.";
  }
}

export function enterPlayerMode() {
  data.access ??= { role: "none", masterPassword: "" };
  data.access.role = "player";
  data.mode = "player";
  save();
  renderAll();
  showToast("플레이어로 접속했습니다.");
}

export function saveMasterPassword() {
  if (data.access.role !== "master") {
    showToast("마스터 권한이 필요합니다.");
    return;
  }
  data.access.masterPassword = $("masterPasswordInput")?.value || "";
  $("masterPasswordInput").value = "";
  save();
  renderAccessStatus();
  showToast(data.access.masterPassword ? "마스터 비밀번호가 설정되었습니다." : "비밀번호 없음 상태입니다.");
}

export function clearMasterPassword() {
  if (data.access.role !== "master") {
    showToast("마스터 권한이 필요합니다.");
    return;
  }
  if (!confirm("마스터 비밀번호를 해제할까요?")) return;
  data.access.masterPassword = "";
  save();
  renderAccessStatus();
  showToast("마스터 비밀번호가 해제되었습니다.");
}

export function renderAccessStatus() {
  const box = $("masterPasswordStatus");
  if (!box) return;
  box.textContent = data.access?.masterPassword
    ? "현재 상태: 마스터 비밀번호 설정됨"
    : "현재 상태: 비밀번호 없음";
}

export function renderStandalonePlayerView() {
  renderPlayerPortal();
  renderStandaloneScene();
  renderStandaloneBosses();
  renderStandaloneTurns();
  renderStandaloneCards();
}

export function renderStandaloneScene() {
  const img = $("standalonePlayerSceneImage");
  const ph = $("standalonePlayerScenePlaceholder");
  const src = data.sceneHistory?.[0] || "";
  if (img && ph) {
    if (src) {
      img.src = src;
      img.style.display = "block";
      ph.style.display = "none";
    } else {
      img.style.display = "none";
      ph.style.display = "block";
    }
  }
  const map = data.maps?.find(m => m.id === data.activeMapId);
  if ($("standalonePlayerCurrentMap")) {
    $("standalonePlayerCurrentMap").textContent = map ? `${map.name}\n${map.desc || ""}` : "현재 맵 정보 없음";
  }
}

export function renderStandaloneBosses() {
  const box = $("standalonePlayerBossArea");
  const panel = $("playerBossSlidePanel");
  if (!box) return;
  const bosses = (data.activeBossIds || []).map(id => data.bosses.find(b => b.id === id)).filter(Boolean);
  panel?.classList.toggle("has-boss", bosses.length > 0);
  if (!bosses.length) {
    box.innerHTML = `<p class="muted">표시 중인 보스 없음</p>`;
    return;
  }
  box.innerHTML = bosses.map(b => {
    const hp = getPercent(b.hp, b.maxHp);
    return `<div class="player-boss-card">
      <h3>${esc(b.name)}</h3>
      <p class="muted">${esc(b.memo || "")}</p>
      <div class="small-bar-frame"><div class="hp-bar hp" style="width:${hp}%"></div></div>
      <div class="stat-line"><span>${b.hp}/${b.maxHp}</span><span>${hp}%</span></div>
    </div>`;
  }).join("");
}

export function renderStandaloneTurns() {
  const list = $("standalonePlayerTurnList");
  if (!list) return;
  if (!data.turns?.length) {
    list.innerHTML = `<li>턴 없음</li>`;
    return;
  }
  list.innerHTML = data.turns.map((t, i) => `<li class="${i === data.currentTurn ? "active" : ""}">
    <strong>${esc(t.name)}</strong> / 선공 ${t.init}
  </li>`).join("");
}

export function renderStandaloneCards() {
  const box = $("standalonePlayerCards");
  if (!box) return;
  box.innerHTML = (data.players || []).map(p => {
    const hp = getPercent(p.hp, p.maxHp);
    const mp = getPercent(p.mp, p.maxMp);
    const exp = getPercent(p.exp, p.nextExp);
    return `<div class="player-view-card">
      ${p.portrait ? `<img src="${p.portrait}" alt="${esc(p.name)}">` : `<div class="portrait-placeholder">NO<br>PORTRAIT</div>`}
      <div>
        <div class="player-name">${esc(p.name)}</div>
        <div class="level-badge">Lv.${p.level || 1}</div>
        <div class="stat-line"><span>HP</span><span>${p.hp}/${p.maxHp}</span></div>
        <div class="small-bar-frame"><div class="hp-bar hp" style="width:${hp}%"></div></div>
        <div class="stat-line"><span>MP</span><span>${p.mp}/${p.maxMp}</span></div>
        <div class="small-bar-frame"><div class="hp-bar mp" style="width:${mp}%"></div></div>
        <div class="stat-line"><span>EXP</span><span>${p.exp || 0}/${p.nextExp || 100}</span></div>
        <div class="small-bar-frame"><div class="hp-bar exp" style="width:${exp}%"></div></div>
        <div class="player-extra">상태: ${esc(p.status || "정상")}<br>Gold ${p.gold || 0}</div>
      </div>
    </div>`;
  }).join("");
}

export function standalonePlayerRoll() {
  const dice = Math.floor(Math.random() * 20) + 1;
  let text = `d20(${dice})`;
  if (dice === 20) text += "\n크리티컬!";
  if (dice === 1) text += "\n펌블!";
  const resultBox = $("standalonePlayerDiceResult");
  if (resultBox) resultBox.textContent = text;
  addLog(`[플레이어 화면 주사위] ${text}`);
  save();
}

export function showToast(message) {
  const box = $("toastMessage");
  if (!box) return console.log(message);
  box.textContent = message;
  box.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => box.classList.add("hidden"), 1600);
}


/* ===== v17.2 Master Tabs + Advanced Systems ===== */

export function bindMasterCategoryTabs() {
  document.querySelectorAll(".master-category-nav button[data-category]").forEach(btn => {
    btn.addEventListener("click", () => {
      setMasterCategory(btn.dataset.category);
    });
  });
  assignMasterCategories();
  setMasterCategory("world");
}

export function assignMasterCategories() {
  const grid = document.querySelector("#masterScreen .setup-grid");
  if (!grid) return;

  let current = "world";
  Array.from(grid.children).forEach(el => {
    if (el.classList.contains("category-divider")) {
      if (el.id.includes("world")) current = "world";
      if (el.id.includes("actors")) current = "actors";
      if (el.id.includes("combat")) current = "combat";
      if (el.id.includes("equipment")) current = "equipment";
      if (el.id.includes("story")) current = "story";
      el.dataset.category = current;
      return;
    }
    if (el.classList.contains("card")) {
      const title = el.querySelector("h2")?.textContent || "";
      el.dataset.category = current;
      if (/맵|월드|랜덤|세력/.test(title)) el.dataset.category = "world";
      if (/플레이어|NPC|보스/.test(title)) el.dataset.category = "actors";
      if (/상태이상|스킬 설정|펌블|전투/.test(title)) el.dataset.category = "combat";
      if (/장비|소재|인챈트|아이템|상점|강화/.test(title)) el.dataset.category = "equipment";
      if (/스킬 트리|저장 슬롯|고급 시스템|컷신|스토리|세션/.test(title)) el.dataset.category = "story";
    }
  });
}

export function setMasterCategory(category) {
  const grid = document.querySelector("#masterScreen .setup-grid");
  if (!grid) return;

  document.querySelectorAll(".master-category-nav button[data-category]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });

  if (category === "all") {
    grid.classList.remove("category-filter-active");
    grid.querySelectorAll(".active-category").forEach(el => el.classList.remove("active-category"));
    return;
  }

  grid.classList.add("category-filter-active");
  Array.from(grid.children).forEach(el => {
    el.classList.toggle("active-category", el.dataset.category === category);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function bindAdvancedSystems() {
  $("playCutsceneBtn")?.addEventListener("click", addAndPlayCutscene);
  $("addSfxBtn")?.addEventListener("click", addSfx);
  $("addFearRuleBtn")?.addEventListener("click", addFearRule);
  $("addCurseBtn")?.addEventListener("click", addCurse);
  $("addDeityBtn")?.addEventListener("click", addDeity);
  $("addResourceBtn")?.addEventListener("click", addResource);
  $("addBossPhaseBtn")?.addEventListener("click", addBossPhase);
  $("addBossPartBtn")?.addEventListener("click", addBossPart);
  $("addInspectBtn")?.addEventListener("click", addInspection);
  $("addDungeonNodeBtn")?.addEventListener("click", addDungeonNode);
  $("addEnvironmentBtn")?.addEventListener("click", addEnvironment);
  $("addCampBtn")?.addEventListener("click", addCamp);
  $("addTimerBtn")?.addEventListener("click", addTimer);
  $("addWorldChangeBtn")?.addEventListener("click", addWorldChange);
  $("addRecipeBtn")?.addEventListener("click", addRecipe);
  $("addSetBtn")?.addEventListener("click", addSet);
  $("addPersonalQuestBtn")?.addEventListener("click", addPersonalQuest);
  $("addMemoryBtn")?.addEventListener("click", addMemory);
  $("addEndingBtn")?.addEventListener("click", addEnding);
  $("runtimePlayCutsceneBtn")?.addEventListener("click", () => {
    const c = data.advanced.cutscenes.find(x => x.id === $("runtimeCutsceneSelect")?.value);
    if (c) playCutscene(c);
  });
  $("runtimeRevealInspectBtn")?.addEventListener("click", revealInspection);
  $("runtimeFearCheckBtn")?.addEventListener("click", runFearCheck);
  $("runtimeCampBtn")?.addEventListener("click", runCamp);
  $("exportSessionBtn")?.addEventListener("click", exportSessionTxt);
  $("closeCutsceneBtn")?.addEventListener("click", () => $("cutsceneOverlay")?.classList.add("hidden"));
  fillFearStatSelect();
}

export function renderAdvancedSystems() {
  fillAdvancedSelects();
  renderAdvancedLists();
  renderTimerView();
}

export function fillAdvancedSelects() {
  fillNpcPortraitSelect();
  fillPhaseBossSelect();
  fillRuntimeCutsceneSelect();
  fillRuntimeInspectSelect();
  fillRuntimeFearSelect();
  fillRuntimeCampSelect();
  fillFearTargetSelect();
}

export function fillFearStatSelect() {
  const s = $("fearStat");
  if (!s || s.options.length) return;
  COMMON_STATS.forEach(stat => s.add(new Option(STAT_LABELS[stat], stat)));
}

export function fillNpcPortraitSelect() {
  const s = $("cutscenePortraitNpc");
  if (!s) return;
  const prev = s.value;
  s.innerHTML = `<option value="">초상화 없음</option>`;
  data.npcs.forEach(n => s.add(new Option(n.name, n.id)));
  if (prev) s.value = prev;
}

export function fillPhaseBossSelect() {
  const s = $("phaseBossSelect");
  if (!s) return;
  const prev = s.value;
  s.innerHTML = "";
  data.bosses.forEach(b => s.add(new Option(b.name, b.id)));
  if (prev) s.value = prev;
}

export function fillRuntimeCutsceneSelect() {
  const s = $("runtimeCutsceneSelect");
  if (!s) return;
  const prev = s.value;
  s.innerHTML = "";
  data.advanced.cutscenes.forEach(c => s.add(new Option(c.speaker || "컷신", c.id)));
  if (prev) s.value = prev;
}

export function fillRuntimeInspectSelect() {
  const s = $("runtimeInspectSelect");
  if (!s) return;
  const prev = s.value;
  s.innerHTML = "";
  data.advanced.inspections.forEach(i => s.add(new Option(i.name, i.id)));
  if (prev) s.value = prev;
}

export function fillRuntimeFearSelect() {
  const s = $("runtimeFearSelect");
  if (!s) return;
  const prev = s.value;
  s.innerHTML = "";
  data.advanced.fearRules.forEach(f => s.add(new Option(f.name, f.id)));
  if (prev) s.value = prev;
}

export function fillRuntimeCampSelect() {
  const s = $("runtimeCampSelect");
  if (!s) return;
  const prev = s.value;
  s.innerHTML = "";
  data.advanced.camps.forEach(c => s.add(new Option(c.name, c.id)));
  if (prev) s.value = prev;
}

export function fillFearTargetSelect() {
  const s = $("runtimeFearTarget");
  if (!s) return;
  const prev = s.value;
  s.innerHTML = "";
  data.players.forEach(p => s.add(new Option(p.name, p.id)));
  if (prev) s.value = prev;
}

export function addAndPlayCutscene() {
  const npc = data.npcs.find(n => n.id === $("cutscenePortraitNpc")?.value);
  const c = {
    id: makeId(),
    speaker: $("cutsceneSpeaker")?.value || npc?.name || "???",
    text: $("cutsceneText")?.value || "",
    portrait: npc?.portrait || ""
  };
  data.advanced.cutscenes.push(c);
  addLog(`컷신 저장: ${c.speaker}`);
  save(); renderAdvancedSystems(); playCutscene(c); showToast("컷신 저장 완료");
}

export function playCutscene(c) {
  $("cutsceneSpeakerView").textContent = c.speaker || "???";
  $("cutsceneTextView").textContent = c.text || "";
  if (c.portrait) {
    $("cutscenePortrait").src = c.portrait;
    $("cutscenePortrait").classList.remove("hidden");
  } else {
    $("cutscenePortrait").classList.add("hidden");
  }
  $("cutsceneOverlay").classList.remove("hidden");
  data.advanced.sessionNotes.push(`[컷신] ${c.speaker}: ${c.text}`);
  save();
}

export function addSfx() { data.advanced.sfx.push({ id: makeId(), name: $("sfxName")?.value || "효과음", url: $("sfxUrl")?.value || "" }); save(); renderAdvancedSystems(); }
export function addFearRule() { data.advanced.fearRules.push({ id: makeId(), name: $("fearName")?.value || "공포 판정", stat: $("fearStat")?.value || "MND", difficulty: Number($("fearDifficulty")?.value || 10), madnessGain: Number($("fearMadnessGain")?.value || 1) }); save(); renderAdvancedSystems(); }
export function addCurse() { data.advanced.curses.push({ id: makeId(), name: $("curseName")?.value || "저주", madnessPerTurn: Number($("curseMadnessPerTurn")?.value || 0), hpPerTurn: Number($("curseHpPerTurn")?.value || 0) }); save(); renderAdvancedSystems(); }
export function addDeity() { data.advanced.deities.push({ id: makeId(), name: $("deityName")?.value || "이름 없는 신", faithReq: Number($("deityFaithReq")?.value || 0), blessing: $("deityBlessing")?.value || "" }); save(); renderAdvancedSystems(); }
export function addResource() { data.advanced.resources.push({ id: makeId(), name: $("resourceName")?.value || "자원", value: Number($("resourceDefault")?.value || 0) }); save(); renderAdvancedSystems(); }
export function addBossPhase() { data.advanced.bossPhases.push({ id: makeId(), bossId: $("phaseBossSelect")?.value || "", hpPercent: Number($("phaseHpPercent")?.value || 50), name: $("phaseName")?.value || "페이즈", bgm: $("phaseBgm")?.value || "", effect: $("phaseEffect")?.value || "" }); save(); renderAdvancedSystems(); }
export function addBossPart() { data.advanced.bossParts.push({ id: makeId(), bossId: $("phaseBossSelect")?.value || "", name: $("bossPartName")?.value || "부위", hp: Number($("bossPartHp")?.value || 10), effect: $("bossPartEffect")?.value || "" }); save(); renderAdvancedSystems(); }
export function addInspection() { data.advanced.inspections.push({ id: makeId(), name: $("inspectName")?.value || "조사 포인트", public: $("inspectPublic")?.value || "", secret: $("inspectSecret")?.value || "" }); save(); renderAdvancedSystems(); }
export function addDungeonNode() { data.advanced.dungeonNodes.push({ id: makeId(), name: $("dungeonNodeName")?.value || "노드", choices: ($("dungeonChoices")?.value || "").split("\\n").filter(Boolean) }); save(); renderAdvancedSystems(); }
export function addEnvironment() { data.advanced.environments.push({ id: makeId(), name: $("environmentName")?.value || "환경 오브젝트", effect: $("environmentEffect")?.value || "" }); save(); renderAdvancedSystems(); }
export function addCamp() { data.advanced.camps.push({ id: makeId(), name: $("campName")?.value || "휴식", hp: Number($("campHp")?.value || 0), mp: Number($("campMp")?.value || 0) }); save(); renderAdvancedSystems(); }
export function addTimer() { data.advanced.timers.push({ id: makeId(), name: $("timerName")?.value || "타이머", turns: Number($("timerTurns")?.value || 1), remaining: Number($("timerTurns")?.value || 1) }); save(); renderAdvancedSystems(); }
export function addWorldChange() { data.advanced.worldChanges.push({ id: makeId(), name: $("worldChangeName")?.value || "월드 변화", desc: $("worldChangeDesc")?.value || "" }); save(); renderAdvancedSystems(); }
export function addRecipe() { data.advanced.recipes.push({ id: makeId(), name: $("recipeName")?.value || "제작법", materials: ($("recipeMaterials")?.value || "").split("\\n").filter(Boolean), result: $("recipeResult")?.value || "" }); save(); renderAdvancedSystems(); }
export function addSet() { data.advanced.sets.push({ id: makeId(), name: $("setName")?.value || "세트", pieces: Number($("setPieces")?.value || 2), effect: $("setEffect")?.value || "" }); save(); renderAdvancedSystems(); }
export function addPersonalQuest() { data.advanced.personalQuests.push({ id: makeId(), owner: $("personalQuestOwner")?.value || "", title: $("personalQuestTitle")?.value || "개인 퀘스트", desc: $("personalQuestDesc")?.value || "" }); save(); renderAdvancedSystems(); }
export function addMemory() { data.advanced.memories.push({ id: makeId(), title: $("memoryTitle")?.value || "기억 파편", text: $("memoryText")?.value || "" }); save(); renderAdvancedSystems(); }
export function addEnding() { data.advanced.endings.push({ id: makeId(), name: $("endingName")?.value || "엔딩", condition: $("endingCondition")?.value || "" }); save(); renderAdvancedSystems(); }

export function revealInspection() {
  const i = data.advanced.inspections.find(x => x.id === $("runtimeInspectSelect")?.value);
  if (!i) return;
  const msg = `[조사] ${i.name}\n공개: ${i.public}\n마스터 비밀: ${i.secret}`;
  addLog(msg);
  $("statCheckResult").textContent = msg;
}

export function runFearCheck() {
  const rule = data.advanced.fearRules.find(x => x.id === $("runtimeFearSelect")?.value);
  const p = data.players.find(x => x.id === $("runtimeFearTarget")?.value);
  if (!rule || !p) return alert("공포 규칙/대상 선택");
  const roll = Math.floor(Math.random() * 20) + 1;
  const stat = Number(p.stats?.[rule.stat] || 0);
  const total = roll + stat;
  let msg = `[공포 판정] ${p.name}: d20(${roll}) + ${STAT_LABELS[rule.stat]}(${stat}) = ${total}`;
  if (total < rule.difficulty) {
    p.madness = Number(p.madness || 0) + rule.madnessGain;
    msg += ` / 실패: 광기 +${rule.madnessGain}`;
    screenEffect("danger");
  } else {
    msg += " / 성공";
  }
  addLog(msg); save(); renderAll();
}

export function runCamp() {
  const camp = data.advanced.camps.find(x => x.id === $("runtimeCampSelect")?.value);
  if (!camp) return;
  data.players.forEach(p => {
    p.hp = Math.min(p.maxHp, p.hp + camp.hp);
    p.mp = Math.min(p.maxMp, p.mp + camp.mp);
  });
  addLog(`[휴식] ${camp.name}: HP +${camp.hp}, MP +${camp.mp}`);
  save(); renderAll();
}

export function exportSessionTxt() {
  const lines = [
    "TRPG SESSION LOG",
    "================",
    "",
    "[전투/시스템 로그]",
    ...(data.diceLog || []),
    "",
    "[컷신/세션 노트]",
    ...(data.advanced.sessionNotes || []),
    "",
    "[월드 변화]",
    ...(data.advanced.worldChanges || []).map(w => `${w.name}: ${w.desc}`),
    "",
    "[엔딩 후보]",
    ...(data.advanced.endings || []).map(e => `${e.name}: ${e.condition}`)
  ];
  const blob = new Blob([lines.join("\\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "trpg-session-log.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export function renderAdvancedLists() {
  const set = (id, html) => { const box = $(id); if (box) box.innerHTML = html; };
  set("cutsceneList", data.advanced.cutscenes.map(c => `<div class="list-item"><div class="row-title">${esc(c.speaker)}</div><div class="row-meta">${esc(c.text).slice(0, 120)}</div></div>`).join(""));
  set("sfxList", data.advanced.sfx.map(s => `<div class="list-item"><div class="row-title">${esc(s.name)}</div><button class="small" data-action="play-sfx" data-url="${escAttr(s.url)}">재생</button></div>`).join(""));
  set("horrorList", [...data.advanced.fearRules.map(f => `<div class="list-item"><div class="row-title">공포: ${esc(f.name)}</div><div class="row-meta">${STAT_LABELS[f.stat]} / 난이도 ${f.difficulty} / 광기 +${f.madnessGain}</div></div>`), ...data.advanced.curses.map(c => `<div class="list-item"><div class="row-title">저주: ${esc(c.name)}</div><div class="row-meta">광기 +${c.madnessPerTurn}/턴, HP -${c.hpPerTurn}/턴</div></div>`)].join(""));
  set("faithResourceList", [...data.advanced.deities.map(d => `<div class="list-item"><div class="row-title">${esc(d.name)}</div><div class="row-meta">요구 신앙 ${d.faithReq}<br>${esc(d.blessing)}</div></div>`), ...data.advanced.resources.map(r => `<div class="list-item"><div class="row-title">${esc(r.name)}</div><div class="row-meta">기본값 ${r.value}</div></div>`)].join(""));
  set("bossAdvancedList", [...data.advanced.bossPhases.map(p => `<div class="list-item"><div class="row-title">페이즈 ${esc(p.name)}</div><div class="row-meta">HP ${p.hpPercent}% 이하<br>${esc(p.effect)}</div></div>`), ...data.advanced.bossParts.map(p => `<div class="list-item"><div class="row-title">부위 ${esc(p.name)}</div><div class="row-meta">HP ${p.hp}<br>${esc(p.effect)}</div></div>`)].join(""));
  set("explorationList", [...data.advanced.inspections.map(i => `<div class="list-item"><div class="row-title">조사 ${esc(i.name)}</div><div class="row-meta">${esc(i.public)}</div></div>`), ...data.advanced.dungeonNodes.map(n => `<div class="list-item"><div class="row-title">던전 ${esc(n.name)}</div><div class="row-meta">${n.choices.map(esc).join(" / ")}</div></div>`), ...data.advanced.environments.map(e => `<div class="list-item"><div class="row-title">환경 ${esc(e.name)}</div><div class="row-meta">${esc(e.effect)}</div></div>`)].join(""));
  set("worldAdvancedList", [...data.advanced.camps.map(c => `<div class="list-item"><div class="row-title">휴식 ${esc(c.name)}</div><div class="row-meta">HP +${c.hp}, MP +${c.mp}</div></div>`), ...data.advanced.timers.map(t => `<div class="list-item"><div class="row-title">타이머 ${esc(t.name)}</div><div class="row-meta">${t.remaining}/${t.turns}턴</div></div>`), ...data.advanced.worldChanges.map(w => `<div class="list-item"><div class="row-title">${esc(w.name)}</div><div class="row-meta">${esc(w.desc)}</div></div>`)].join(""));
  set("craftList", [...data.advanced.recipes.map(r => `<div class="list-item"><div class="row-title">${esc(r.name)}</div><div class="row-meta">${r.materials.map(esc).join(", ")} → ${esc(r.result)}</div></div>`), ...data.advanced.sets.map(s => `<div class="list-item"><div class="row-title">세트 ${esc(s.name)}</div><div class="row-meta">${s.pieces}개 필요<br>${esc(s.effect)}</div></div>`)].join(""));
  set("storyAdvancedList", [...data.advanced.personalQuests.map(q => `<div class="list-item"><div class="row-title">${esc(q.owner)}: ${esc(q.title)}</div><div class="row-meta">${esc(q.desc)}</div></div>`), ...data.advanced.memories.map(m => `<div class="list-item"><div class="row-title">기억 ${esc(m.title)}</div><div class="row-meta">${esc(m.text)}</div></div>`), ...data.advanced.endings.map(e => `<div class="list-item"><div class="row-title">엔딩 ${esc(e.name)}</div><div class="row-meta">${esc(e.condition)}</div></div>`)].join(""));
}

export function renderTimerView() {
  const box = $("timerView");
  if (!box) return;
  box.innerHTML = data.advanced.timers.length
    ? data.advanced.timers.map(t => `${esc(t.name)}: ${t.remaining}/${t.turns}턴`).join("<br>")
    : "진행 중인 타이머 없음";
}

export function renderAdvancedListsAndTimers() {
  renderAdvancedLists();
  renderTimerView();
}


/* ===== v17.3 Player Character Creation ===== */



export function bindCreationSystem() {
  $("newPlayerPortrait")?.addEventListener("change", e => readImage(e, v => appState.tempNewPlayerPortrait = v));
  $("rollCreationStatBtn")?.addEventListener("click", rollCreationStats);
  $("rollClassDiceBtn")?.addEventListener("click", rollClassDice);
  $("createPlayerCharacterBtn")?.addEventListener("click", createPlayerFromPortal);
  $("creationClassSelect")?.addEventListener("change", renderCreationClassDesc);
  $("saveCreationRuleBtn")?.addEventListener("click", saveCreationRule);
  $("resetCreationSessionBtn")?.addEventListener("click", resetCreationSession);
  $("clearClassListBtn")?.addEventListener("click", clearClassList);
  $("addClassSkillBtn")?.addEventListener("click", addTempClassSkill);
  $("addClassBtn")?.addEventListener("click", addCreationClass);
  const leaveBtn = $("leaveCharacterBtn");
  if (leaveBtn) {
    leaveBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      leavePlayerCharacter();
    };
  }
  $("merchantShopNpcSelect")?.addEventListener("change", renderMerchantShopLookForm);
  $("merchantShopType")?.addEventListener("change", fillMerchantGoodsSelect);
  $("merchantShopImage")?.addEventListener("change", e => readImage(e, v => appState.tempMerchantShopImage = v));
  $("saveMerchantShopLookBtn")?.addEventListener("click", saveMerchantShopLook);
  $("addMerchantShopGoodsBtn")?.addEventListener("click", addMerchantShopGoods);
  $("clearMerchantShopBtn")?.addEventListener("click", clearMerchantShopGoods);
  $("closePlayerShopBtn")?.addEventListener("click", () => $("playerShopModal")?.classList.add("hidden"));
  $("closeMainSceneShopBtn")?.addEventListener("click", closeMainSceneShop);
  $("playerShopModal")?.addEventListener("click", e => { if (e.target.id === "playerShopModal") $("playerShopModal")?.classList.add("hidden"); });
}

export function renderCreationSystem() {
  renderCreationRuleForm();
  renderCreationStatsGrid();
  renderCreationClassSelect();
  renderClassList();
  renderMerchantShopSetup();
  renderPlayerPortal();
  renderInlineShopForCurrentCharacter();
  renderInlineForgeForCurrentCharacter();
}

export function renderCreationRuleForm() {
  if ($("creationDiceSides")) {
    $("creationDiceSides").value = data.creation.diceSides || 20;
    $("creationRollLimit").value = data.creation.rollLimit || 3;
    $("classRollLimit").value = data.creation.classRollLimit || 3;
    $("unusedStatGold").value = data.creation.unusedGold || 0;
    $("unusedStatExp").value = data.creation.unusedExp || 0;
    const eqSel = $("unusedStatEquipment");
    if (eqSel) {
      const prev = eqSel.value || data.creation.unusedEquipmentId || "";
      eqSel.innerHTML = `<option value="">장비 보상 없음</option>`;
      data.equipments.forEach(e => eqSel.add(new Option(e.name, e.id)));
      eqSel.value = prev;
    }
  }
  const skillSel = $("classSkillSelect");
  if (skillSel) {
    const prev = skillSel.value;
    skillSel.innerHTML = `<option value="">초기 스킬 선택</option>`;
    data.skills.forEach(s => skillSel.add(new Option(s.name, s.id)));
    if (prev) skillSel.value = prev;
  }
  const shopSel = $("classShopNpcSelect");
  if (shopSel) {
    const prev = shopSel.value;
    shopSel.innerHTML = `<option value="">연결 상점 없음</option>`;
    data.npcs
      .filter(n => n.job === "merchant" || n.job === "상인")
      .forEach(n => shopSel.add(new Option(`${n.name}의 상점`, n.id)));
    if (prev) shopSel.value = prev;
  }
}

export function saveCreationRule() {
  data.creation.diceSides = Math.max(1, Number($("creationDiceSides")?.value || 20));
  data.creation.rollLimit = Math.max(1, Number($("creationRollLimit")?.value || 3));
  data.creation.classRollLimit = Math.max(1, Number($("classRollLimit")?.value || 3));
  data.creation.unusedGold = Number($("unusedStatGold")?.value || 0);
  data.creation.unusedExp = Number($("unusedStatExp")?.value || 0);
  data.creation.unusedEquipmentId = $("unusedStatEquipment")?.value || "";
  save();
  showToast("캐릭터 생성 규칙 저장 완료");
}

export function addTempClassSkill() {
  const id = $("classSkillSelect")?.value;
  if (!id) return;
  if (!appState.tempClassSkillIds.includes(id)) appState.tempClassSkillIds.push(id);
  renderTempClassSkills();
}

export function renderTempClassSkills() {
  const box = $("classSkillPreview");
  if (!box) return;
  box.innerHTML = appState.tempClassSkillIds.map((id, i) => {
    const s = data.skills.find(x => x.id === id);
    return `<div class="mini-item">${esc(s?.name || "스킬")} <button class="small danger" data-action="remove-temp-class-skill" data-index="${i}">삭제</button></div>`;
  }).join("");
}

export function removeTempClassSkill(i) {
  appState.tempClassSkillIds.splice(i, 1);
  renderTempClassSkills();
}

export function addCreationClass() {
  const name = $("classNameInput")?.value.trim();
  if (!name) return alert("직업 이름을 입력하세요.");
  data.creation.classes.push({
    id: makeId(),
    name,
    minRoll: Number($("classMinRollInput")?.value || 1),
    maxRoll: Number($("classMaxRollInput")?.value || 20),
    desc: $("classDescInput")?.value || "",
    statMods: readStats("class"),
    isMerchant: !!$("classIsMerchantInput")?.checked,
    shopNpcId: $("classShopNpcSelect")?.value || "",
    skillIds: structuredClone(appState.tempClassSkillIds)
  });
  appState.tempClassSkillIds = [];
  clearInputs(["classNameInput", "classMinRollInput", "classMaxRollInput", "classDescInput"]);
  clearStats("class");
  if ($("classIsMerchantInput")) $("classIsMerchantInput").checked = false;
  if ($("classShopNpcSelect")) $("classShopNpcSelect").value = "";
  renderTempClassSkills();
  save();
  renderCreationSystem();
  showToast("직업 저장 완료");
}

export function renderClassList() {
  const box = $("classList");
  if (!box) return;
  box.innerHTML = data.creation.classes
    .sort((a, b) => a.minRoll - b.minRoll)
    .map(c => {
      const mods = classStatText(c.statMods);
      const shop = c.shopNpcId ? data.npcs.find(n => n.id === c.shopNpcId)?.name || "연결 상점" : "없음";
      return `<div class="list-item">
      <div class="row-title">${esc(c.name)} / ${classRollText(c)}</div>
      <div class="row-meta">${esc(c.desc || "")}<br>스탯 보정: ${mods}<br>초기 스킬 ${c.skillIds?.length || 0}개 / 상인 ${c.isMerchant ? "예" : "아니오"} / 연결 상점 ${esc(shop)}</div>
      <button class="small danger" data-delete-class="${c.id}">삭제</button>
    </div>`;
    }).join("");
}

export function classRollText(c) {
  const min = Math.max(1, Number(c.minRoll || 1));
  const max = Math.max(min, Number(c.maxRoll || 20));
  return min === max ? `${min}` : `${min}~${max}`;
}

export function classStatText(stats) {
  const text = COMMON_STATS
    .filter(stat => Number(stats?.[stat] || 0) !== 0)
    .map(stat => `${STAT_LABELS[stat]} ${Number(stats[stat]) > 0 ? "+" : ""}${stats[stat]}`)
    .join(" / ");
  return text || "없음";
}

export function isClassAllowedByRoll(c, roll) {
  if (!roll) return false;
  const min = Math.max(1, Number(c.minRoll || 1));
  const max = Math.max(min, Number(c.maxRoll || 20));
  return roll >= min && roll <= max;
}

export function deleteCreationClass(id) {
  if (!confirm("직업을 삭제할까요?")) return;
  data.creation.classes = data.creation.classes.filter(c => c.id !== id);
  save();
  renderCreationSystem();
}


export function resetCreationSession() {
  if (!confirm("현재 플레이어 생성 진행상태를 초기화할까요?")) return;
  data.playerSession.creationRoll = 0;
  data.playerSession.creationRollsUsed = 0;
  data.playerSession.classRoll = 0;
  data.playerSession.classRollsUsed = 0;
  data.playerSession.creationRemaining = 0;
  data.playerSession.creationStats = {};
  data.playerSession.currentPlayerId = "";
  save();
  renderAll();
  showToast("플레이어 생성 진행 초기화 완료");
}

export function clearClassList() {
  if (!confirm("직업 목록을 전부 삭제할까요?")) return;
  data.creation.classes = [];
  appState.tempClassSkillIds = [];
  save();
  renderCreationSystem();
  showToast("직업 목록 전체 삭제 완료");
}

export function clearMerchantShopGoods() {
  if (!confirm("상인 판매 목록을 전부 삭제할까요?")) return;
  data.creation.merchantShops = [];
  data.creation.shopLooks = {};
  save();
  renderMerchantShopSetup();
  renderAll();
  showToast("상인 판매 목록 초기화 완료");
}

