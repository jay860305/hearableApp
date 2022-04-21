/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, Text, TouchableOpacity, FlatList} from 'react-native';

import Modal from 'react-native-modal';
import {Divider} from 'react-native-paper';

import RNFS from 'react-native-fs';

const RepsModal = ({showModal, setShowModal, repsItem, setRepsItem}) => {
  const renderItem = ({item}) => {
    return (
      <>
        <TouchableOpacity
          onPress={() => {
            setRepsItem(item);
            setShowModal(false);
          }}>
          <View
            style={{
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              height: 35,
              backgroundColor: repsItem.id === item.id ? 'gray' : 'whtie',
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
          height: 340,
          width: 256,
        }}>
        <FlatList
          data={[
            {id: 1, label: '1', value: '1 Reps'},
            {id: 2, label: '2', value: '2 Reps'},
            {id: 3, label: '3', value: '3 Reps'},
            {id: 4, label: '4', value: '4 Reps'},
            {id: 5, label: '5', value: '5 Reps'},
            {id: 6, label: '6', value: '6 Reps'},
            {id: 7, label: '7', value: '7 Reps'},
            {id: 8, label: '8', value: '8 Reps'},
            {id: 9, label: '9', value: '9 Reps'},
          ]}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListFooterComponent={<Divider />}
        />
      </View>
    </Modal>
  );
};

export default RepsModal;
