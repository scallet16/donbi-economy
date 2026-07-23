import { emptyAppData, type AppData, type LearningStorage } from "./types";
const DB_NAME = "donbi-economy"; const STORE = "learning-data"; const KEY = "app";
export class IndexedDbLearningStorage implements LearningStorage {
  private open(): Promise<IDBDatabase> { if (typeof indexedDB === "undefined") return Promise.reject(new Error("이 브라우저에서는 학습 기록을 저장할 수 없어요.")); return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error("학습 기록 저장소를 열 수 없어요.")); }); }
  async load() { const db = await this.open(); return new Promise<AppData>((resolve, reject) => { const tx = db.transaction(STORE, "readonly"); const request = tx.objectStore(STORE).get(KEY); request.onsuccess = () => resolve((request.result as AppData | undefined) ?? emptyAppData()); request.onerror = () => reject(new Error("학습 기록을 불러오지 못했어요.")); tx.oncomplete = () => db.close(); }); }
  async save(data: AppData) { const db = await this.open(); return new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(data, KEY); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(new Error("학습 기록을 저장하지 못했어요.")); }); }
  async clear() { const db = await this.open(); return new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).clear(); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(new Error("학습 기록을 삭제하지 못했어요.")); }); }
}
export type RemoteLearningStorage = LearningStorage;
