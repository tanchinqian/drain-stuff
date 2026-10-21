// Design sketch, untested on hardware. See README before enabling radio.
#include <Arduino.h>
#include <Preferences.h>
#include <SPI.h>
#include <lmic.h>
#include <hal/hal.h>
#include "payload.h"
#include "secrets.h" // Site-owned EUIs/OTAA key and DRAIN_RADIO_APPROVED.
#ifndef DRAIN_RADIO_APPROVED
#error "Confirm regional radio plan, credentials and bench wiring before enabling transmission"
#endif
const lmic_pinmap lmic_pins={.nss=5,.rxtx=LMIC_UNUSED_PIN,.rst=14,.dio={26,33,LMIC_UNUSED_PIN}};
// Site secrets use little-endian APP_EUI/DEV_EUI arrays and big-endian APP_KEY.
void os_getArtEui(u1_t* b){memcpy(b,APP_EUI,8);}
void os_getDevEui(u1_t* b){memcpy(b,DEV_EUI,8);}
void os_getDevKey(u1_t* b){memcpy(b,APP_KEY,16);}
Preferences nv;
uint8_t packet[12];uint32_t intervalS=900;
RTC_DATA_ATTR uint16_t minutes=0,previousDistance=0;
RTC_DATA_ATTR uint8_t repeated=0;
uint16_t distanceMm(){digitalWrite(25,HIGH);delay(500);digitalWrite(17,LOW);delayMicroseconds(4);digitalWrite(17,HIGH);delayMicroseconds(10);digitalWrite(17,LOW);const auto pulse=pulseIn(16,HIGH,40000);digitalWrite(25,LOW);return pulse?uint16_t(pulse*.343f/2):0;}
void onEvent(ev_t event){if(event==EV_TXCOMPLETE){minutes+=intervalS/60;esp_sleep_enable_timer_wakeup(uint64_t(intervalS)*1000000ULL);esp_deep_sleep_start();}}
void setup(){
 pinMode(25,OUTPUT);pinMode(17,OUTPUT);pinMode(16,INPUT);pinMode(27,INPUT_PULLUP);digitalWrite(25,LOW);
 const auto distance=distanceMm();const bool crest=digitalRead(27)==LOW;
 repeated=distance==previousDistance?repeated+1:0;
 const bool rising=previousDistance>distance&&previousDistance-distance>50;
 previousDistance=distance;intervalS=(crest||rising)?120:900;
 const uint16_t battery=uint16_t(analogReadMilliVolts(35)*4.3f);
 const uint8_t flags=(crest?1:0)|(repeated>=3?2:0)|((distance<300||distance>5000)?4:0)|(battery<3000?8:0);
 nv.begin("drain",false);uint32_t counter=nv.getUInt("counter",0)+1;if(counter>0xffffff)while(true)delay(1000);nv.putUInt("counter",counter);nv.end();
 // No environmental temperature probe is selected; use a separately measured temperature before bench radio tests.
 encodePayload(packet,flags,minutes,distance,29,battery,counter);
 SPI.begin(18,19,23,5);os_init();LMIC_reset();LMIC_setTxData2(1,packet,12,0);
}
void loop(){os_runloop_once();}
