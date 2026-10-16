#include "payload.h"
#include <cassert>
#include <cstdio>
int main(){uint8_t b[12];encodePayload(b,0,20,800,-3,3300,0x010203);const uint8_t expected[]={1,0,0,20,3,32,253,12,228,1,2,3};for(int i=0;i<12;i++){assert(b[i]==expected[i]);printf("%02x",b[i]);}puts("");}
