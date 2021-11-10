import React, { useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeFirestore, collection, getDocs, query, orderBy, limit,
  where, doc, addDoc, getDoc, onSnapshot
} from "firebase/firestore";
import { firebaseConfig } from './Secrets';

let app;
if (getApps().length == 0){
  app = initializeApp(firebaseConfig);
} 
const db = initializeFirestore(app, {
  useFetchStreams: false
});

let snapshotUnsubscribe = undefined;

export default function App() {

  const boards = ['#general', '#announcements', '#random'];
  const [inputText, setInputText] = useState('');
  const [authorText, setAuthorText] = useState('');
  const [messages, setMessages] = useState([]);
  const [board, setBoard] = useState(boards[0]);

  function subscribeToSnapshot () {
    if (snapshotUnsubscribe) {
      snapshotUnsubscribe();
    }
    const q = query(collection(db, 'messageBoard'));
    snapshotUnsubscribe = onSnapshot(q, (qSnap) => {
      let newMessages = [];
      qSnap.docs.forEach((docSnap)=>{
        let msg = docSnap.data();
        msg.key = docSnap.id;
        msg.timestamp = msg.timestamp.toDate();
        newMessages.push(msg);
      });
      setMessages(newMessages);
    });
  }

  useEffect(()=>{ 
    subscribeToSnapshot();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Text>Message:</Text>
        <TextInput
          style={styles.inputBox}
          value={inputText}
          onChangeText={(text)=>setInputText(text)}
        />
      </View>
      <View style={styles.inputContainer}>
        <Text>From:</Text>
        <TextInput
          style={styles.inputBox}
          value={authorText}
          onChangeText={(text)=>setAuthorText(text)}
        />
      </View>
      <View>
        <Button
          title="Send"
          onPress={()=>{
            let newMsg = {
                author: authorText,
                text: inputText,
                timestamp: new Date(),
            };
            addDoc(collection(db, "messageBoard"), newMsg);
            setInputText('');
          }}
        />
      </View>
      <View style={styles.boardSelectionContainer}>
        <FlatList
          contentContainerStyle={styles.boardSelectionContentContainer}
          data={boards}
          renderItem={({item})=>{
            return (
              <Button
                title={item}
                onPress={()=>{
                  setBoard(item)
                }}
                color={item===board?'red': 'gray'}
              />
            );
          }}
          keyExtractor={(item, index)=>item}
        />
      </View>
      <View style={styles.chatContainer}>
        <FlatList
          data={messages}
          renderItem={({item})=>{
            return (
              <View style={[
                styles.messageContainer
              ]}>
                <Text style={styles.messageText}>
                  {item.author}: {item.text} 
                  <Text style={{fontSize: 9}}> ( 
                  {item.timestamp
                    .toLocaleDateString('en-us', { 
                      month:"numeric", 
                      day:"numeric", 
                      hour:"numeric", 
                      minute:"numeric",
                      seconds: "numeric"
                    })} 
                  )</Text>
                </Text>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '15%'
  },
  inputContainer: {
    flex: 0.1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignContent: 'center',
    width: '90%',
  },
  inputBox: {
    width: '60%', 
    borderColor: 'black',
    borderWidth: 1, 
    height: 40
  },
  boardSelectionContainer: {
    flex: 0.1, 
    //flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center'
  },  
  boardSelectionContentContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center'
  },  
  chatContainer: {
    flex: 0.6,
    width: '100%',
    // justifyContent: 'flex-start',
    // alignItems: 'flex-start',
    margin: '3%'
  },
  messageContainer: {
    flex: 0.05,
    padding: '2%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: '100%'
  },
  messageText: {
    fontSize: 18
  }
});
