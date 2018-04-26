#!/usr/bin/python
""" linear_actuator_driver.py
Communicates with the Adafruit Motor HAT to drive the linear actuators
  over I2C

The script is meant to be called by node using pythonshell. Command line
  args determine which pedal will move and in which direction, then the
  move is executed and the script exits.
  
  ***THIS SCRIPT IS NOT RESPONSIBLE FOR RESTRICTING MOVEMENT!*** 
  To prevent damage, state information about the actuators' positions
  must persist separately from this script.

Author: Edward Maskelony    |    exm8563@rit.edu
"""
import argparse
from Adafruit_MotorHAT import Adafruit_MotorHAT, Adafruit_DCMotor
from time import sleep

debug = False
default_freq = 1600
extend_time_sec  = 0.500
retract_time_sec = 0.500


# register the parameters of each pedal actuator channel here.
# if each actuator needs multiple channels, all channels must be on the same HAT.
actuators = {
    "sustain": {
        "address": 0x60,  # first board, no solder jumpers
        "channels":[4]
        },
    "sostenuto": {
        "address": 0x60,  
        "channels":[2]  
        },
    "soft": {
        "address": 0x60,
        "channels":[3]  
        }
    }
    # Useage example, if another HAT or more channels are needed:
    # "heavy": {
    #     "address": 0x61,    # second board, solder jumper A0
    #     "channels":[3,4]    # two motor channels, wired in parallel
    #     },

class LinearActuator:
    def __init__(self, hat_addr, channels, freq=default_freq, name="", speed=255):
        self._motor_hat = Adafruit_MotorHAT(addr=hat_addr)
        self._channels = []
        self.name = name

        for chan in channels:
            c = self._motor_hat.getMotor(chan)
            # motor will not run unless speed is explicitly set
            c.setSpeed(speed)  # 0 to 255
            self._channels.append(c)
            
    def stopActuator(self):
        if debug:
            print("Stopping {}\n".format(self.name))
        for chan in self._channels:
            chan.run(Adafruit_MotorHAT.RELEASE)
            
    def _startExtend(self):
        for chan in self._channels:
            chan.run(Adafruit_MotorHAT.FORWARD)

    def _startRetract(self):
        for chan in self._channels:
            chan.run(Adafruit_MotorHAT.BACKWARD)
            
    def extend(self):
        if debug:
            print("Moving {} up\n\t".format(self.name))
        self._startExtend()
        sleep(extend_time_sec)
        self.stopActuator()
    
    def retract(self):
        if debug:
            print("Moving {} down\n\t".format(self.name))
        self._startRetract()
        sleep(retract_time_sec)
        self.stopActuator()
        
def main():
    parser = argparse.ArgumentParser(description="Select and operate a linear actuator")
    
    parser.add_argument('name', metavar='PEDAL', type=str, help="name of the pedal to actuate (sustain/sostenuto/soft)")
    parser.add_argument('dir', metavar='DIRECTION', type=str, help="direction to move (up/down)")
    parser.add_argument('-v', "--verbose", action="store_true", help="print extra information")    
    
    args = parser.parse_args()
    
    if args.verbose:
        debug = True
    try:
        act_properties = actuators[args.name.lower()]
    except KeyError:
        print("Error: specified pedal '{}' is invalid!".format(args.name))
        return 1
    actuator = LinearActuator(act_properties["address"], act_properties["channels"], name=args.name)
    if args.dir.lower() == "up":
        actuator.extend()
    elif args.dir.lower() == "down":
        actuator.retract()
    else:
        print("Error: invalid direction specified; only 'up' or 'down' supported\n")

main()