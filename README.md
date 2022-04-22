# hearableApp

# 1. hearableApp

## 1.1. hearableApp이란?

hearableApp(이하 App)은 스마트폰 어플리케이션이다. bunnit에서 개발한 hearable device(이하 device)와 통신하여 얻어진 데이터를 디스플레이 하거나 파일을 생성하는 기능을 가지고 있다.

## 1.2 device와 App간 데이터 통신

device와 App은 bluetooth ble 통신을 이용하여 데이터를 주고 받으며 react-native-ble-manager 라이브러리를 사용하여 통신한다.

## 1.3 platform

Android OS를 지원, react native로 개발되서 IOS 버전도 빌드 및 배포는 가능할 것으로 생각된다. 단, 하위 라이브러리에 대한 테스트 및 측정 파일 생성 경로등 확인되지 않은 사안들이 있어서 IOS 버전이 필요하다면 추가 개발이 필요하다.

## 1.4 git 주소

```
git@github.com:jay860305/hearableApp.git
```

## 1.5 build

```
yarn // 패키지 설치
yarn android // 안드로이드 빌드
cd android && ./gradlew assembleRelease // 안드로이드 release build
```

---

# 2. App 사용 방법

## 2.1 Connect

device 장치 연결에 사용하는 버튼으로 bluetooth ble 신호 중에 'Hearable'라는 이름을 가진 이름을 찾아서 연결을 시도한다. 연결이 안되는 경우는 다른 ble 어플(ios기준 BLE Scanner 같은 앱)을 다운받아서 장치에서 ble 신호를 송출하는지 확인하다. (이름이 없는 경우는 장치 이슈일 가능성이 높음)

## 2.2 Tracking - Start & End

장치와 연결후 Tracking Start하면 데이터 tracking을 시작한다. App에서 device로 Service ID를 이용해 notification 요청 신호를 전송하면 device에서는 해당 Service ID에 대한 정보(IMU Data)를 지속적으로 송출한다. End 버튼을 누르면 notification 종료 신호를 전달해서 device는 정보 송출을 중단한다. 이때까지 누적된 데이터는 안드로이드 기준 Android/data/com.hearableapp/files 경로에 파일이 저장된다. (파일명 2021-06-13_11-55-21.txt와 같은 포맷으로 생성됨)

### 2.2.1 Service ID

hearable device에서 제공하는 제공하는 service ID (이외에도 ble 통신 규약에 정의된 service ID가 사용 가능하다. (battery level 등과 같은 )

```
#define UUID128_BUNNIT_SERVICE      79,ca,58,11,3c,0b,41,92,b9,da,58,0b,7a,92,09,e1

#define UUID128_BUNNIT_IMU_CONFIG   79,ca,58,13,3c,0b,41,92,b9,da,58,0b,7a,92,09,e1
#define UUID128_BUNNIT_IMU_RAW      79,ca,58,14,3c,0b,41,92,b9,da,58,0b,7a,92,09,e1
#define UUID128_BUNNIT_IMU_DATA     79,ca,58,15,3c,0b,41,92,b9,da,58,0b,7a,92,09,e1

#define UUID128_BUNNIT_PPG_CONFIG   79,ca,58,16,3c,0b,41,92,b9,da,58,0b,7a,92,09,e1
#define UUID128_BUNNIT_PPG_DATA     79,ca,58,17,3c,0b,41,92,b9,da,58,0b,7a,92,09,e1
```

### 2.2.2 Service ID 호출 예시

기본적으로 베이스로 UUID128_BUNNIT_SERVICE를 메인으로 호출하고 sub로 호출하려는 service ID를 입력하면 된다.

```
 BleManager.startNotification(
          peripheralId,
          '79ca5811-3c0b-4192-b9da-580b7a9209e1',
          '79ca5814-3c0b-4192-b9da-580b7a9209e1',
        )
```

### 2.2.3 IMU Data

```
181,255,237,255,15,64,0,0,2,0,254,255,0,0,0,0,0,128,0,0,90,28,198,96

uint32 sensor_time;    // 4 byte
imu_raw_accel_t accel; // 6 byte
imu_raw_gyro_t  gyro;  // 6 byte
imu_raw_mag_t   mag;   // 6 byte
uint16 idx;            // 2 byte for padding

typedef PACKED(struct {
    int16 x;
    int16 y;
    int16 z;
}) imu_raw_accel_t;

typedef PACKED(struct {
    int16 x;
    int16 y;
    int16 z;
}) imu_raw_gyro_t;

typedef PACKED(struct {
    int16 x;
    int16 y;
    int16 z;
}) imu_raw_mag_t;
```

### 2.2.4 PPG Data

IMU Data notification On 상태에서 호출해야한다. Off 상태에서 호출하면 일정시간이 지난 후 sleep 모드에 들어가면서 데이터를 송출하지 않음.

<PPG Data 구조>

```
typedef struct ATTRIBUTE_STRUCT_PACKED {

    uint8_t         op_mode; /* Current Operation Mode:
                                    0: Continuous HRM and Continuous SpO2
                                    1: Continuous HRM and One-shot SpO2
                                    2: Continuous HRM
                                    3: Sampled HRM
                                    4: Sampled HRM and One-shot SpO2
                                    5: Activity tracking
                                    6: SpO2 calibration   */
    uint8_t         hr_10x[2];      //10x heartrate
    uint8_t         hr_confidence;  //Calculated confidence level in %
    uint8_t         rr_10x[2];      //10x RR - inter-beat interval in ms
    uint8_t         rr_confidence;  //Calculated confidence level in %
    uint8_t         activity_class; /* Activity class:
                                            0: Rest
                                            1: Other
                                            2: Walk
                                            3: Run
                                            4: Bike */
    uint8_t         r_10x[2];           // 10x calculated SpO2 R value
    uint8_t         spo2_confidence;    // Calculated confidence level in %
    uint8_t         spo2_10x[2];        // 10x SpO2 %
    uint8_t         spo2_progress;                  // Calculation progress in % (only in one-shot mode of algorithm)
    uint8_t         is_spo2_low_signal_quality_low; //Shows low quality of PPG signal: 0: good quality 1: low quality
    uint8_t         is_spo2_motion_excessive;       // Shows excessive motion: 0: no motion 1: excessive motion
    uint8_t         is_spo2_low_pi_low;             // Shows low perfusion index (PI) of PPG signal: 0: normal PI 1: low PI
    uint8_t         is_spo2_r_unreliable;           //Shows reliability of R: 0: reliable 1: unreliable
    uint8_t         spo2_state;         /* Reported status of SpO2 algorithm:
                                            0: LED adjustment
                                            1: Computation
                                            2: Success
                                            3: Timeout */
    uint8_t         scd_state;          /* Skin Contact state:
                                            0: Undetected
                                            1: Off Skin
                                            2: On some subject
                                            3: On Skin */
} output_fifo_fmt_algo_normal_t;
```

<PPG data 표현식> (펌웨어 참고 코드)

```
#define PRINT_MEAS_FMT_ALGO_NORMAL(X)
    do
    {
        DPRINTF("op mode : %d", (X)->op_mode);
        DPRINTF("HR   : %d (%d %%)", ARRAY2INT16((X)->hr_10x) / 10, (X)->hr_confidence);
        DPRINTF("RR   : %d (%d %%)", ARRAY2INT16((X)->rr_10x) / 10, (X)->rr_confidence);
        DPRINTF("SPO2 : %d (%d %%) : progress %d %%", ARRAY2INT16((X)->spo2_10x) / 10, (X)->spo2_confidence, (X)->spo2_progress);
        DPRINTF("Skin Dectection : %d(%s)", (X)->scd_state, scd_str[(X)->scd_state]);
        DPRINTF("activity : %d(%s)", (X)->activity_class, activity_str[(X)->activity_class]);

    } while (0)

#define PRINT_MEAS_FMT_ALGO_EXTEND(X)
    do
    {
        DPRINTF("op mode : %d", (X)->op_mode);
        DPRINTF("HR   : %d (%d %%)", ARRAY2INT16((X)->hr_10x) / 10, (X)->hr_confidence);
        DPRINTF("RR   : %d (%d %%)", ARRAY2INT16((X)->rr_10x) / 10, (X)->rr_confidence);
        DPRINTF("SPO2 : %d (%d %%) : progress %d %%", ARRAY2INT16((X)->spo2_10x) / 10, (X)->spo2_confidence, (X)->spo2_progress);
        DPRINTF("Skin Dectection : %d(%s)", (X)->scd_state, scd_str[(X)->scd_state]);
        DPRINTF("activity : %d(%s)", (X)->activity_class, activity_str[(X)->activity_class]);
        DPRINTF("total_run_steps : %d", ARRAY2INT32((X)->total_run_steps));
    } while (0)


/* sensor hub data is MSB first */
#define ARRAY2INT32(c0) \
        ( ((uint32_t)(uint8_t)*(c0)<<24) |
          ((uint32_t)(uint8_t)*(c0+1)<<16) |
          ((uint32_t)(uint8_t)*(c0+2)<<8) |
          ((uint32_t)(uint8_t)*(c0+3)) )

#define ARRAY2INT24(c0) \
            ( ((uint32_t)(uint8_t)*(c0)<<16) |
              ((uint32_t)(uint8_t)*(c0+1)<<8) |
              ((uint32_t)(uint8_t)*(c0+2)) )

#define ARRAY2INT16(c0) \
        ( ((uint16_t)(uint8_t)*(c0)<<8) |
          ((uint16_t)(uint8_t)*(c0+1)) )
```

# 2.3 Start & End

Start, End 버튼은 Tracking 중간에 운동 시작 종료 tag를 위해서 사용한다. start버튼 오른쪽에 위치한 운동 선택버튼을 통해서 운동 종류를 선택하고 end버튼 오른쪽에 위치한 횟수를 이용해서 운동 종료 tag를 남긴다. 아래 예시와 같이 [Start] [End]는 Tracking 시작 종료 여부이고, [Workout] 으로 시작하는 Tag가 Start, End버튼을 이용해서 운동 시작 종료를 구분하는 Tag를 넣는다.

```
[Start]
181,255,237,255,15,64,0,0,2,0,254,255,0,0,0,0,0,128,0,0,90,28,198,96
189,255,253,255,34,64,0,0,255,255,3,0,0,0,0,0,0,128,1,0,90,28,198,96
177,255,242,255,202,63,0,0,255,255,1,0,0,0,0,0,0,128,2,0,90,28,198,96
183,255,19,0,35,64,0,0,251,255,2,0,0,0,0,0,0
[Workout1. deadlift Start]
187,255,25,0,201,63,0,0,255,255,3,0,0,0,0,0,0,128,237,2,97,28,198,96
167,255,1,0,45,64,0,0,254,255,2,0,0,0,0,0,0,128,238,2,97,28,198,96
162,255,254,255,224,63,0,0,1,0,1,0,0,0,0,0,0,128,239,2,97,28,198,96
188,255,222,255,226,63,0,0,253,255,255,255,0,0,0,0,0,128,240,2,97,28,198,96
218,255,243,255,74,64,0,0,255,255,255,255,0,0,0,0,0,128,241,2,97,28,198,96
191,255,3,0,188,63,0,0,2,0,255,255,0,0,0,0,0,128,242,2,97,28,198,96
193,255,3,0,35,64,0,0,253,255,254,255,0,0,0,0,0,128,243,2,97,28,198,96
[Workout1. deadlift Finish - 3 Reps]
176,255,2,0,46,64,0,0,252,255,255,255,0,0,0,0,0,128,31,21,145,28,198,96
203,255,12,0,201,63,0,0,1,0,255,255,0,0,0,0,0,128,32,21,145,28,198,96
213,255,1,0,101,64,0,0,1,0,0,0,0,0,0,0,0,128,33,21,145,28,198,96
[Finish]
```
