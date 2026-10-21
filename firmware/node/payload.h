#pragma once
#include <stdint.h>
inline void encodePayload(uint8_t *b,uint8_t flags,uint16_t minutes,uint16_t distance,int8_t temperature,uint16_t battery,uint32_t counter) {
  b[0]=1;b[1]=flags&15;b[2]=minutes>>8;b[3]=minutes;b[4]=distance>>8;b[5]=distance;b[6]=uint8_t(temperature);b[7]=battery>>8;b[8]=battery;b[9]=counter>>16;b[10]=counter>>8;b[11]=counter;
}
