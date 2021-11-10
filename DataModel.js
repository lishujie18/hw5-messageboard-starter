import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeFirestore, collection, getDocs, query,
  doc, addDoc, getDoc, onSnapshot
} from "firebase/firestore";
import { firebaseConfig } from './Secrets';

let app;
if (getApps().length == 0){
  app = initializeApp(firebaseConfig);
} 
const db = initializeFirestore(app, {
  useFetchStreams: false
});

class DataModel {
  constructor() {
    this.usersRef = collection(db, 'users');
    this.chatsRef = collection(db, 'chats');
    this.users = [];
    this.chats = [];
    this.modelChangeListeners = [];
    this.chatListeners = [];
    this.asyncInit();
  }

  asyncInit = async () => {
    await this.loadUsers();
    await this.loadChats();
    //this.subscribeToChats();
  }

  // manage in-app listeners
  addModelChangeListener = (callbackFunction) => {
    let timestamp = Date.now();
    this.modelChangeListeners.push({
      id: timestamp,
      callback: callbackFunction
    })
  }

  // manage in-app listeners
  removeModelChangeListener = (listenerID) => {
    const idx = this.modelChangeListeners.findIndex((elem)=>elem.id===listenerID);
    this.modelChangeListeners.splice(idx, 1);
  }

  // tell in-app listeners *something* has changed
  updateModelChangeListeners = () => {
    for (mcl of this.modelChangeListeners) {
      mcl.callback();
    }
  }

  addChatListener = (chatID, callbackFunction) => {
    this.chatListeners.push({
      id: Datetime.now(),
      chatID: chatID,
      callback: callbackFunction
    });
  }

  removeChatListener = (listenerID) => {
    const idx = this.chatListeners.findIndex((elem)=>elem.id===listenerID);
    this.chatListeners.splice(idx, 1);
  }

  notifyChatListeners = (chatID) => {
    for (cl of this.chatListeners) {
      if (cl.chatID === chatID) {
        cl.callback();
      }
    }
  }

  // for now, users never change once loaded
  loadUsers = async () => {
    const q = query(this.usersRef);
    const querySnap = await getDocs(q);
    if (querySnap.empty) return;

    querySnap.docs.forEach(qDocSnap => {
      let key = qDocSnap.id;
      let data = qDocSnap.data();
      data.key = key;
      this.users.push(data);
    });

    this.updateModelChangeListeners();
  }

  getUsers = () => {
    return this.users;
  }

  loadChat = async (user1, user2) => {
    const userKeys = [user1.key, user2.key];
    userKeys.sort(); 
    const chatKey = userKeys[0] + "_" + userKeys[1];
    const chatDocRef = doc(db, 'chats', chatKey);
    const chatDoc = await getDoc(chatDocRef);

    if (chatDoc.exists) {
      let chat = {};
      const chatIdx = this.chats.findIndex((elem)=>elem.id===chatKey);
      if (chatIdx !== -1) {
        chat = chatDoc.data();
        chat.key = chatDoc.id;
        this.chats.push(chat);
      } else {
        chat = this.chats[chatIdx];
      }

      let chatMessages = [];
      const chatMessageCollRef = collection(db, chatDoc, 'messages');
      const chatMessageQuerySnap = await getDocs(chatMessageCollRef);
      if (!chatMessageQuerySnap.empty) {
        chatMessageQuerySnap.docs.forEach((docSnap)=>{
          let message = docSnap.data();
          message.key = docSnap.id;
          chatMessages.push(message);
        })
      }
    } 
    chat.messages = chatMessages;
    notifyChatListeners(chatKey);
  }

  addChatMessage = async (user1, user2, message) => {
    const userKeys = [user1.key, user2.key];
    userKeys.sort(); 
    const chatKey = userKeys[0] + "_" + userKeys[1];

    // add to firebase
    const chatDocRef = doc(db, 'chats', chatKey);
    const chatDoc = await getDoc(chatDocRef);
    const chatMessageCollRef = collection(db, chatDoc, 'messages');
    let newMessageDocRef = await addDoc(chatMessageCollRef, message);
    message.key = newMessageDocRef.id;

    // add to local structure
    if (!this.chats[chatKey]) {
      this.chats[chatKey] = {
        messages: [],
        participants: [user1, user2],
        key: chatKey
      };
    }
    const chat = this.chats[chatKey];
    chat.messages.push(message);
    this.notifyChatListeners(chatKey);
  }
}

let theDataModel = undefined;

export function getDataModel() {
  if (!theDataModel) {
    theDataModel = new DataModel();
  }
  return theDataModel;
}