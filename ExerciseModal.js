import React from 'react';
import {View, Text, TouchableOpacity, FlatList} from 'react-native';

import Modal from 'react-native-modal';
import {Divider} from 'react-native-paper';

import RNFS from 'react-native-fs';

const ExerciseModal = ({showModal, setShowModal, exItem, setExItem}) => {
  const renderItem = ({item}) => {
    return (
      <>
        <TouchableOpacity
          onPress={() => {
            setExItem(item);
            setShowModal(false);
          }}>
          <View
            style={{
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              height: 50,
              backgroundColor: exItem.id === item.id ? 'gray' : 'whtie',
            }}>
            <Text style={{textAlign: 'center'}}>{item.label}</Text>
          </View>
        </TouchableOpacity>
        <Divider />
      </>
    );
  };

  return (
    <Modal
      onBackdropPress={() => setShowModal(false)}
      onBackButtonPress={() => setShowModal(false)}
      isVisible={showModal}
      backdropOpacity={0.75}>
      <View
        style={{
          borderRadius: 6,
          backgroundColor: '#ffffff',
          alignSelf: 'center',
          height: 360,
          width: 256,
        }}>
        <FlatList
          data={[
            {id: 1, label: '스쿼트', value: 'squat'},
            {id: 2, label: '푸시업', value: 'pushup'},
            {id: 3, label: '데드리프트', value: 'deadlift'},
            {id: 4, label: '풀업', value: 'pullup'},
            {id: 5, label: '싯업', value: 'situp'},
            {id: 6, label: '버피', value: 'burpee'},
            {id: 7, label: '플랭크', value: 'Plank-'},
          ]}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListFooterComponent={<Divider />}
        />
      </View>
    </Modal>
  );
};

export default ExerciseModal;
