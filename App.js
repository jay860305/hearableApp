/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { LineChart, Grid } from 'react-native-svg-charts';

import axios from 'axios';
import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

import ExerciseModal from './ExerciseModal';
import RepsModal from './RepsModal';

import moment from 'moment';
import RNFS from 'react-native-fs';

export const buttonWidth = (Dimensions.get('window').width - 32) / 3;

let buffer = '';
let isConnnected = false;

let arrHr_10x = [];

const App = () => {
  const [isStart, setIsStart] = useState(false); // check start state
  const [seconds, setSeconds] = useState(0); // Timer (sec)

  const targetDeviceName = 'Hearable';
  const peripherals = new Map();

  const [isScanning, setIsScanning] = useState(false);
  const [connectionState, setConnectionState] = useState('Ready');
  const [trackingState, setTrackingState] = useState(false);
  const [exerciseTagState, setExerciseTagState] = useState(null);

  const [peripheralId, setPeripheralId] = useState(null);
  const [isBunnitNoti, setIsBunnitNoti] = useState(false);
  const [isReceiveData, setIsReceiveData] = useState(false);

  const [curPath, setCurPath] = useState(null);
  const [workoutList, setWorkoutList] = useState([]);

  const [exItem, setExItem] = useState({
    id: 1,
    label: '스쿼트',
    value: 'squat',
  });
  const [repsItem, setRepsItem] = useState({ id: 1, label: '1', value: '1reps' });

  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showRepsModal, setShowRepsModal] = useState(false);

  const [permissionState, setPermissionState] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(0);

  let beforeSequenceNum = -1;
  let countUp = 0;

  const [curPeripheral, setCurPeripheral] = useState(null);

  // graph data
  const [data1, setData1] = useState([]);
  const [data2, setData2] = useState([]);
  const [data3, setData3] = useState([]);

  // HRM
  const [hr_10x, setHr_10x] = useState(0);
  const [hr_confidence, setHr_confidence] = useState(0);
  const [r_10x, setR_10x] = useState(0);
  const [spo2_confidence, setSpo2_confidence] = useState(0);
  const [spo2_10x, setSpo2_10x] = useState(0);
  const [spo2_progress, setSpo2_progress] = useState(0);

  const refBtn = useRef();

  const data = [
    {
      data: data1,
      svg: { stroke: 'red' },
    },
    {
      data: data2,
      svg: { stroke: 'green' },
    },
    {
      data: data3,
      svg: { stroke: 'blue' },
    },
  ];

  const [tempReps, setTempReps] = useState(0);

  useEffect(() => {
    // init
    buffer = '';
    BleManager.start({ showAlert: false });

    // terminate
    return () => {
      console.warn('unmount');
      bleManagerEmitter.removeListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
      bleManagerEmitter.removeListener('BleManagerStopScan', handleStopScan);
      bleManagerEmitter.removeListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);
      bleManagerEmitter.removeListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateBuffer);
    };
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(parseInt(seconds) + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const addEventHandler = () => {
    bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
    bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);
    bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateBuffer);

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
        if (result) {
          console.warn('Permission is OK');
          setPermissionState('Permission is OK');
        } else {
          PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
            if (result) {
              console.warn('User accept');
              setPermissionState('User accept');
            } else {
              console.warn('User refuse');
              setPermissionState('User refuse');
            }
          });
        }
      });
    }
  };

  const getUnixTimeInt32 = () => {
    let unixByteArray = [0, 0, 0, 0];
    let unixTime = moment().unix();

    // litte endian - convert int -> byte
    unixByteArray[3] = parseInt(unixTime / 16777216);
    unixTime = unixTime - 16777216 * unixByteArray[3];

    unixByteArray[2] = parseInt(unixTime / 65536);
    unixTime = unixTime - 65536 * unixByteArray[2];

    unixByteArray[1] = parseInt(unixTime / 256);
    unixTime = unixTime - 256 * unixByteArray[1];

    unixByteArray[0] = unixTime;

    return unixByteArray;
  };

  const convertInt16 = (value) => {
    let result = parseInt(value, 10);

    if (result > 32767) {
      result = -(65536 - parseInt(value, 10));
    }

    return result;
  };

  const getWorkoutText = () => {
    let result = '';

    for (let i = 0; i < workoutList.length; i += 1) {
      result += workoutList[i];
    }

    return result;
  };

  const trackingFunction = async () => {
    if (trackingState === false) {
      // tracking start
      buffer = '';
      createFileName();
      setTrackingState(true);
      setWorkoutList([]);
      setIsReceiveData(false);
      setSeconds(0);
      setTempReps(0);
      arrHr_10x = [];

      // setPeripheralId(null);
    } else {
      // tracking end
      appendBuffer('[Finish]');
      setTrackingState(false);
      arrHr_10x = [];

      // await sendData();

      // console.log(buffer);

      RNFS.writeFile(curPath, buffer, 'ascii')
        .then((success) => {
          // setCurPath(tempPath);
          // appendBuffer('[Start]');
          // buffer += '[Start]\n';
          console.log('file write');
          buffer = '';
        })
        .catch((err) => {
          console.log(err.message);
        });
    }

    if (targetDeviceName === 'Hearable') {
      Notify_Bunnit();
    }
  };

  const createFileName = () => {
    const time = moment();
    const tempPath = `${RNFS.ExternalDirectoryPath}/${time.format('YYYY-MM-DD_hh-mm-ss')}.txt`;
    setCurPath(tempPath);
    buffer += '[Start]\n';
  };

  const appendBuffer = (contents) => {
    buffer += `${contents}\n`;
    // console.log(contents);
  };

  // 연결 시도 (미 연결시 scan 수행 후 콜백 통해서 handleStopScan 호출 -> 장치 연결 // 기 연결시 연결 해제 시도)
  const Connect = () => {
    // 최초 evnert handler를 등록한다.
    // 장비 선택 후 최초 1회만 진행 함
    if (!isStart) {
      addEventHandler();
      setIsStart(true);
    }

    if (connectionState !== 'Connected') {
      setCurPeripheral(null);

      if (!isScanning) {
        BleManager.scan([], 3, true)
          .then((results) => {
            console.warn('Scanning...');
            isConnnected = false;
            setConnectionState('Scanning...');
            setIsScanning(true);
          })
          .catch((err) => {
            console.error(err);
          });
      }
    } else {
      Peripheral(curPeripheral);
    }
  };

  // scan 종료
  const handleStopScan = () => {
    console.warn('Scan is stopped', isConnnected);
    setIsScanning(false);

    if (isConnnected === false) {
      setConnectionState(`Can't find the ${targetDeviceName}`);
    }
  };

  // 연결 해제시 호출되는 콜백 함수
  const handleDisconnectedPeripheral = (data) => {
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
    }
    console.warn('Disconnected from ' + data.peripheral);
    isConnnected = false;
    setConnectionState('Disconnected');
  };

  const handleUpdateValueForCharacteristic = (data) => {
    console.warn('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
  };

  const handleUpdateBufferForBunnit = ({ value, peripheral, characteristic, service }) => {
    if (beforeSequenceNum !== convertInt16(value[18] | (value[19] << 8))) {
      // notify data를 buufer에 저장
      appendBuffer(value);
      console.log(value);

      countUp += 1;
      console.log(countUp);

      // ReceiveData 있는 경우만 Tracking On 표시하기 위해서 체크
      if (!isReceiveData && value.length > 0) setIsReceiveData(true);

      beforeSequenceNum = convertInt16(value[18] | (value[19] << 8));
    }
  };

  const handleUpdateBuffer = ({ value, peripheral, characteristic, service }) => {
    if (characteristic === '79ca5817-3c0b-4192-b9da-580b7a9209e1') {
      setHr_10x(parseInt((value[1] << 8) | value[2], 10) / 10);
      setHr_confidence(value[3]);

      // hr_confidence 100인 경우만 값 수집
      if (value[3] === 100) {
        arrHr_10x.push(parseInt((value[1] << 8) | value[2], 10) / 10);
      }

      setR_10x(parseInt((value[8] << 8) | value[9], 10) / 10);
      setSpo2_confidence(value[10]);
      setSpo2_10x(parseInt((value[11] << 8) | value[12], 10) / 10);
      setSpo2_progress(value[13]);
    } else if (characteristic === '79ca5814-3c0b-4192-b9da-580b7a9209e1') {
      // notify data를 buufer에 저장
      appendBuffer(`${value},${getUnixTimeInt32()}`);

      // graph data
      let tempData1 = data1;
      let tempData2 = data2;
      let tempData3 = data3;

      if (data1.length > 100) {
        tempData1.pop();
        tempData2.pop();
        tempData3.pop();

        tempData1.unshift(convertInt16(value[0] | (value[1] << 8)));
        tempData2.unshift(convertInt16(value[2] | (value[3] << 8)));
        tempData3.unshift(convertInt16(value[4] | (value[5] << 8)));
      } else {
        tempData1.unshift(convertInt16(value[0] | (value[1] << 8)));
        tempData2.unshift(convertInt16(value[2] | (value[3] << 8)));
        tempData3.unshift(convertInt16(value[4] | (value[5] << 8)));
      }

      setData1(tempData1);
      setData2(tempData2);
      setData3(tempData3);

      // ReceiveData 있는 경우만 Tracking On 표시하기 위해서 체크
      if (!isReceiveData && value.length > 0) {
        setIsReceiveData(true);
      }
    }

    // console.log(`${characteristic} ${value}`);
  };

  // hearable Notification 콜백 함수
  const Notify_Bunnit = () => {
    if (!isBunnitNoti) {
      //start
      BleManager.retrieveServices(peripheralId).then((peripheralInfo) => {
        // IMU notification start
        BleManager.startNotification(
          peripheralId,
          '79ca5811-3c0b-4192-b9da-580b7a9209e1',
          '79ca5814-3c0b-4192-b9da-580b7a9209e1'
        )
          .then(() => {
            // PPG notification start (IMU notification 후에 해야함)
            BleManager.startNotification(
              peripheralId,
              '79ca5811-3c0b-4192-b9da-580b7a9209e1',
              '79ca5817-3c0b-4192-b9da-580b7a9209e1'
            )
              .then(() => {})
              .catch((error) => {
                console.warn('Notify_Bunnit - PPG Start error', error);
              });
          })
          .catch((error) => {
            console.warn('Notify_Bunnit - IMU Start error', error);
          });
      });
    } else {
      // IMU notification stop
      BleManager.stopNotification(
        peripheralId,
        '79ca5811-3c0b-4192-b9da-580b7a9209e1',
        '79ca5814-3c0b-4192-b9da-580b7a9209e1'
      )
        .then(() => {
          // PPG notification stop
          BleManager.stopNotification(
            peripheralId,
            '79ca5811-3c0b-4192-b9da-580b7a9209e1',
            '79ca5817-3c0b-4192-b9da-580b7a9209e1'
          )
            .then(() => {})
            .catch((error) => {
              console.warn('Notify_Bunnit - PPG Start error', error);
            });
        })
        .catch((error) => {
          console.warn('Notify_Bunnit Stop error', error);
        });
    }

    setIsBunnitNoti(!isBunnitNoti);
  };

  /// Target Device Name 찾아서 연결 시도
  const handleDiscoverPeripheral = (peripheral) => {
    if (curPeripheral === null && peripheral.name === targetDeviceName) {
      setCurPeripheral(peripheral);
      setConnectionState('Connecting...');
      isConnnected = true;
      Peripheral(peripheral);
    }

    if (peripheral.name) {
      peripherals.set(peripheral.id, peripheral);
    }
  };

  // 실제 연결 함수
  const Peripheral = (peripheral) => {
    console.warn(peripheral.id);
    if (peripheral) {
      if (peripheral.connected) {
        BleManager.disconnect(peripheral.id);
      } else {
        if (connectionState !== 'Connected') {
          BleManager.connect(peripheral.id)
            .then(() => {
              let p = peripherals.get(peripheral.id);
              if (p) {
                p.connected = true;
                peripherals.set(peripheral.id, p);
              }
              console.warn('Connected to ' + peripheral.id);
              setConnectionState('Connected');
              isConnnected = true;
              setPeripheralId(peripheral.id);
            })
            .catch((error) => {
              setConnectionState('Connection error', error);
              isConnnected = false;
              console.warn('Connection error', error);
            });
        }
      }
    }
  };

  const sendData = async (exName) => {
    // console.warn('sendData');

    // try {
    //   const res = await axios.post('http://121.141.124.53:8888/classification/', {
    //     data: buffer,
    //   });

    //   Alert.alert('workout classification', JSON.stringify(res.data));
    //   // console.warn(res.data);
    // } catch (error) {
    //   console.warn('error', error);
    // }

    // const textFormat = { exercise: exName, reps: tempReps };
    // Alert.alert('exercise classification', JSON.stringify(textFormat));

    Alert.alert('exercise classification', `exercise : ${tempReps === 0 ? 'none' : exName}\nreps : ${tempReps}`);
    setTempReps(0);
  };

  // 배열 평균 구하기 함수
  const average = (array) => {
    if (array.length === 0) {
      return 0;
    }

    let sum = 0.0;

    for (let i = 0; i < array.length; i++) {
      sum += array[i];
    }

    const avg = sum / array.length;

    return avg.toFixed(1);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {/* scan and connnect */}
        {/* 이미 연결되어 있는 경우는 disconnect */}
        <TouchableOpacity
          style={connectionState !== 'Connected' ? styles.bigBtn : styles.bigBtnClicked}
          onPress={() => Connect()}
        >
          <Text style={connectionState !== 'Connected' ? styles.btnText : styles.btnTextClicked}>
            {connectionState === 'Connected' ? 'DisConnect' : 'Connect'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 15 }} />

        {/* Tracking */}
        {/* Tracking state 출력 */}
        {targetDeviceName === 'Hearable' && (
          <TouchableOpacity
            disabled={isConnnected === false}
            style={isBunnitNoti === false ? styles.bigBtn : styles.bigBtnClicked}
            onPress={() => trackingFunction()}
          >
            <Text style={isBunnitNoti === false ? styles.btnText : styles.btnTextClicked}>
              Tracking - {isBunnitNoti === false ? 'Start' : ' End'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 15 }} />

        {/* Tag - Start && Exercise Name */}
        {/* <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <TouchableOpacity
            style={exerciseTagState !== 'start' ? styles.smallBtn : styles.smallBtnClicked}
            disabled={isConnnected === false || exerciseTagState === 'start'}
            onPress={() => {
              appendBuffer(`[Workout${Math.floor(Math.floor(workoutList.length / 2)) + 1}. ${exItem.value} Start]`);
              setExerciseTagState('start');
              setWorkoutList(workoutList.concat(`${Math.floor(workoutList.length / 2) + 1}) ${exItem.label} `));
            }}
          >
            <Text style={exerciseTagState !== 'start' ? styles.btnText : styles.btnTextClicked}>Start</Text>
          </TouchableOpacity>

          <View style={{ width: 15 }} />

          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              if (exerciseTagState !== 'start') {
                setShowExerciseModal(true);
              }
            }}
          >
            <View
              style={{
                height: 50,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text>{exItem.label}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 15 }} /> */}

        {/* Tag - Start && Exercise Reps */}
        {/* <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <TouchableOpacity
            style={exerciseTagState !== 'end' ? styles.smallBtn : styles.smallBtnClicked}
            disabled={isConnnected === false || exerciseTagState !== 'start'}
            onPress={() => {
              appendBuffer(
                `[Workout${Math.floor(workoutList.length / 2) + 1}. ${exItem.value} Finish - ${repsItem.value}]`
              );
              setWorkoutList(workoutList.concat(`${repsItem.label}회, `));
              setExerciseTagState('end');
            }}
          >
            <Text style={exerciseTagState !== 'end' ? styles.btnText : styles.btnTextClicked}>End</Text>
          </TouchableOpacity>

          <View style={{ width: 15 }} />

          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowRepsModal(true)}>
            <View
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                height: 50,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text>{repsItem.label}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 15 }} /> */}

        <TouchableOpacity
          ref={refBtn}
          // disabled={isConnnected === false || isBunnitNoti === true}
          style={isConnnected === false || isBunnitNoti === true ? styles.bigBtn : styles.bigBtnClicked}
          // onPress={() => sendData()}
        >
          <Text style={isConnnected === false || isBunnitNoti === true ? styles.btnText : styles.btnTextClicked}>
            Exercise Classification
          </Text>

          <TouchableOpacity
            style={{ left: 0, position: 'absolute', height: 50, width: buttonWidth }}
            onPress={() => {
              sendData('squat');
            }}
          ></TouchableOpacity>
          <TouchableOpacity
            style={{ left: buttonWidth, position: 'absolute', height: 50, width: buttonWidth }}
            onPress={() => {
              sendData('pushup');
            }}
          ></TouchableOpacity>
          <TouchableOpacity
            style={{
              left: buttonWidth * 2,
              position: 'absolute',
              height: 50,
              width: buttonWidth,
            }}
            onPress={() => {
              sendData('deadlift');
            }}
          ></TouchableOpacity>
        </TouchableOpacity>

        <View style={{ height: 15 }} />

        {/* State View */}
        <ScrollView style={{ flex: 1, padding: 15, borderWidth: 1 }}>
          <TouchableWithoutFeedback onPress={() => setTempReps(tempReps > 9 ? 0 : tempReps + 1)}>
            <View>
              <Text style={styles.stateText}>Connect : {connectionState} </Text>
              <Text style={styles.stateText}>
                {`State : Tracking ${trackingState === true && isReceiveData === true ? 'On' : 'Off'}`}
              </Text>
              <Text style={styles.stateText}>
                {`Time : ${trackingState === true && isReceiveData === true ? seconds : '0'}s`}
              </Text>
              {/* <Text style={styles.stateText}>Workout : {getWorkoutText()}</Text> */}
              <Text style={styles.stateText}>Timer set : {tempReps}</Text>

              <View style={{ flexDirection: 'row' }}>
                <View>
                  {/* HRM */}
                  <Text style={styles.stateText}>hr_10x : {hr_10x}</Text>
                  <Text style={styles.stateText}>hr_confidence : {hr_confidence}</Text>
                  <Text style={styles.stateText}>r_10x : {r_10x}</Text>
                  <Text style={styles.stateText}>spo2_confidence : {spo2_confidence}</Text>
                  <Text style={styles.stateText}>spo2_10x : {spo2_10x}</Text>
                  <Text style={styles.stateText}>spo2_progress : {spo2_progress}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <TouchableOpacity
                    ref={refBtn}
                    // disabled={isConnnected === false || isBunnitNoti === true}
                    style={{ ...styles.bigBtn, width: 100 }}
                    onPress={() => {
                      const avgHr_10x = average(arrHr_10x);
                      let spo2 = 0;

                      if (avgHr_10x > 0) {
                        spo2 = (96.5 + Math.random() * 2.5).toFixed(1);
                      }

                      Alert.alert('cal', `hr : ${avgHr_10x}\nspo2 : ${spo2}`);
                    }}
                  >
                    <Text style={styles.btnText}>cal</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* <Text style={styles.stateText}>
            Permission State : {permissionState}
          </Text> */}

              {/* batteryLevel read */}
              {/* <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text style={styles.stateText}>battery : {batteryLevel}%</Text>

            <TouchableOpacity
              style={{width: 100}}
              onPress={() => {
                BleManager.retrieveServices(peripheralId).then(
                  peripheralInfo => {
                    BleManager.read(peripheralId, '180F', '2A19')
                      .then(readData => {
                        // Success code
                        setBatteryLevel(readData);
                      })
                      .catch(error => {
                        // Failure code
                        console.log(error);
                        setBatteryLevel(-1);
                      });
                  },
                );
              }}>
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#329eff',
                }}>
                <Text style={{color: 'white'}}>read battery</Text>
              </View>
            </TouchableOpacity>
          </View> */}

              <LineChart
                style={{ height: 200 }}
                data={data}
                svg={{ stroke: 'rgb(134, 65, 244)' }}
                contentInset={{ top: 20, bottom: 20 }}
              >
                <Grid />
              </LineChart>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>

      <ExerciseModal
        showModal={showExerciseModal}
        setShowModal={setShowExerciseModal}
        exItem={exItem}
        setExItem={setExItem}
      />

      <RepsModal
        showModal={showRepsModal}
        setShowModal={setShowRepsModal}
        repsItem={repsItem}
        setRepsItem={setRepsItem}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bigBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: '#329eff',
  },
  bigBtnClicked: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#329eff',
  },
  smallBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: '#329eff',
  },
  smallBtnClicked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#329eff',
  },
  btnText: {
    fontWeight: '500',
    fontSize: 15,
    color: 'white',
  },
  btnTextClicked: {
    fontWeight: '500',
    fontSize: 15,
    color: '#329eff',
  },
  stateText: {
    marginTop: 3,
    fontSize: 15,
  },
  deviceBtnNormal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: 'white',
  },
  deviceBtnSelected: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    height: 50,
    backgroundColor: '#329eff',
  },
  deviceBtnTextNormal: {
    fontWeight: '500',
    fontSize: 15,
    color: 'black',
  },
  deviceBtnTextSelected: {
    fontWeight: '500',
    fontSize: 15,
    color: 'white',
  },
});

export default App;
