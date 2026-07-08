import { firebaseConfig } from "./firebase_config.js";
import { appState, data, $ } from "./constants_data.js";
import { renderAll } from "./rendering.js";

// Firebase 모듈 로딩은 ES Module CDN을 직접 탑재합니다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db = null;
let unsubscribe = null;
let isUpdatingFromFirestore = false;

// Firebase 설정이 완료되었는지 검사
export function isFirebaseReady() {
  return firebaseConfig && firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

// Firebase 및 Firestore 인스턴스 초기화
export function initFirebase() {
  if (db) return true;
  if (!isFirebaseReady()) {
    console.warn("Firebase 설정이 완료되지 않았습니다. js/firebase_config.js 파일을 확인하세요.");
    return false;
  }
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    return true;
  } catch (e) {
    console.error("Firebase 초기화 에러:", e);
    return false;
  }
}

// 특정 방(Room)에 들어가 실시간 수신 감시 시작
export function initSync(roomId) {
  if (!initFirebase()) return;
  
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  const roomDocRef = doc(db, "rooms", roomId);
  
  unsubscribe = onSnapshot(roomDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const remoteData = docSnap.data();
      
      // 원격 데이터 수신 중에는 로컬 save()에 의한 업로드를 잠시 차단하여 무한루프 방지
      isUpdatingFromFirestore = true;
      
      // 로컬 데이터 객체 전체 업데이트
      Object.keys(remoteData).forEach(key => {
        data[key] = remoteData[key];
      });
      
      // 로컬 스토리지 백업 보관
      localStorage.setItem("trpg_dashboard_data_v13", JSON.stringify(data));
      
      // UI 강제 업데이트
      renderAll();
      
      isUpdatingFromFirestore = false;
      
      updateSyncStatusUI();
    } else {
      // 룸 문서가 없는 새로운 방일 경우 현재 로컬의 데이터를 원격지에 첫 생성하여 세팅
      console.log(`새로운 방 [${roomId}] 문서 생성 중...`);
      saveToFirestore();
    }
  }, (err) => {
    console.error("Firestore 실시간 수신 실패:", err);
  });
}

// 로컬 변경 데이터를 Firestore에 업로드
export function saveToFirestore() {
  if (!db || !appState.currentRoomId || isUpdatingFromFirestore) return;

  const roomDocRef = doc(db, "rooms", appState.currentRoomId);
  const dataClone = JSON.parse(JSON.stringify(data));
  
  // 마스터 비밀번호 등은 보안상 동기화에서 배제하고 싶을 경우 처리 (현재는 전체 동기화)
  setDoc(roomDocRef, dataClone).catch(err => {
    console.error("Firestore 업로드 실패:", err);
  });
}

// 방 생성하기
export function createRoom() {
  if (!isFirebaseReady()) {
    return alert("실시간 멀티플레이를 시작하려면 먼저 js/firebase_config.js에 Firebase 키 설정을 완료하셔야 합니다.");
  }
  // 무작위 6자리 방 코드 생성 (대문자 + 숫자)
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let roomId = "";
  for (let i = 0; i < 6; i++) {
    roomId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  joinRoom(roomId);
}

// 방 입장하기
export function joinRoom(roomId) {
  if (!roomId) return alert("방 코드를 입력하세요.");
  roomId = roomId.trim().toUpperCase();

  if (!isFirebaseReady()) {
    return alert("실시간 멀티플레이를 시작하려면 먼저 js/firebase_config.js에 Firebase 키 설정을 완료하셔야 합니다.");
  }

  appState.currentRoomId = roomId;
  appState.isSyncing = true;

  // URL 주소창에 파라미터 업데이트 (새로고침 없이 ?room=CODE 설정)
  const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomId}`;
  window.history.pushState({ path: newUrl }, "", newUrl);

  initSync(roomId);
  updateSyncStatusUI();
}

// 방 퇴장하기 (로컬 모드로 전환)
export function leaveRoom() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  appState.currentRoomId = "";
  appState.isSyncing = false;

  // URL 파라미터에서 room 제거
  const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  window.history.pushState({ path: newUrl }, "", newUrl);

  updateSyncStatusUI();
  renderAll();
}

// 동기화 상태 UI 데코레이션 업데이트
export function updateSyncStatusUI() {
  const indicator = $("syncStatusIndicator");
  const roomInfo = $("syncRoomInfo");
  if (!indicator) return;

  if (appState.isSyncing && appState.currentRoomId) {
    indicator.className = "sync-status connected";
    indicator.textContent = "● 실시간 동기화 중";
    if (roomInfo) {
      roomInfo.innerHTML = `방 코드: <strong>${appState.currentRoomId}</strong> 
        <button class="small" data-action="copy-share-link">링크 복사</button>
        <button class="small danger" data-action="leave-room">연동 해제</button>`;
    }
  } else {
    indicator.className = "sync-status disconnected";
    indicator.textContent = "● 로컬 단독 플레이 중";
    if (roomInfo) {
      roomInfo.innerHTML = `
        <input type="text" id="syncRoomInput" placeholder="방 코드 입력" style="width: 100px; display:inline-block; margin-right: 5px;" />
        <button class="small" data-action="join-room">방 참가</button>
        <button class="small primary" data-action="create-room">새 방 만들기</button>`;
    }
  }
}
