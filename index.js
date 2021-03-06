const dgram        = require('dgram')
const net          = require('net')
const debug        = require('debug')('tsl-umd-v5')
const EventEmitter = require('events');

class TSL5 extends EventEmitter {
    constructor () {
        super()
        this._DLE = 0xFE
        this._STX = 0x02

        //Message Format
        this._PBC     = 0 //offset
        this._VER     = 2
        this._FLAGS   = 3
        this._SCREEN  = 4
        this._INDEX   = 6
        this._CONTROL = 8
        this._LENGTH  = 10
    }

    listenUDP(port) {
        var server = dgram.createSocket('udp4')
        server.bind(port)

        server.on('message',(msg, rinfo) => {
            this.processTally(msg, rinfo.address)
            debug('UDP Message recieved: ', msg)
        })

        server.on('listening', () => {
            var address = server.address();
            debug(`server listening ${address.address}:${address.port}`);
        });

        server.on('error', (err) => {
            debug('UDP server error: ', err);
            throw err;
        });
    }

    listenTCP(port) {
        var server = net.createServer((socket) => {

            socket.on('data', (data) => {
                this.processTally(data, socket.remoteAddress)
                debug('TCP Message recieved: ', data)
            })

            socket.on('close', () => {
                debug('TCP socket closed')
            })

            socket.on('error', (err) => {
                debug('UDP server error: ', err);
                throw err;
            })
        })
        server.listen(port)
    }

    processTally(data, source) {
        let buf = Buffer.from(data)
        let tally = { display: {} }

        //Strip DLE/STX if present and un-stuff any DLE stuffing
        if (buf[0] == this._DLE && buf[1] == this._STX) {
            buf = buf.subarray(2)
            
            for (let index = 4; index < buf.length; index++) {

                if ((buf[index] == this._DLE) && (buf[index + 1] == this._DLE)) {
                  buf = Buffer.concat([buf.subarray(0, index), buf.subarray(index + 2)])
                }
              }
        }
        tally.sender  = source ? source : undefined
        tally.pbc     = buf.readInt16LE(this._PBC)
        tally.ver     = buf.readInt8(this._VER)
        tally.flags   = buf.readInt8(this._VER)
        tally.screen  = buf.readInt16LE(this._SCREEN)
        tally.index   = buf.readInt16LE(this._INDEX)
        tally.control = buf.readInt16LE(this._CONTROL)
        tally.length  = buf.readInt16LE(this._LENGTH)
        tally.display.text = buf.toString('ascii', this._LENGTH+2)

        tally.display.rh_tally     = (tally.control >> 0 & 0b11);
		tally.display.text_tally   = (tally.control >> 2 & 0b11);
		tally.display.lh_tally     = (tally.control >> 4 & 0b11);
		tally.display.brightness   = (tally.control >> 6 & 0b11);
		tally.display.reserved     = (tally.control >> 8 & 0b1111111);
		tally.display.control_data = (tally.control >> 15 & 0b1);

        this.emit('message', tally)
    }

    constructPacket(tally, sequence) {
        let bufUMD = Buffer.alloc(12)

        if (!tally.index) { 
            tally.index = 1 //default to index 1
        }
    
        bufUMD.writeUInt16LE(tally.screen, this._SCREEN) 
        bufUMD.writeUInt16LE(tally.index,  this._INDEX)  
    
        if (tally.display) {
            let display = tally.display
    
            if (display.text){
                let text    = Buffer.from(display.text)
                let lenText = Buffer.byteLength(text)
    
                bufUMD.writeUInt16LE(lenText, this._LENGTH)
                bufUMD = Buffer.concat([bufUMD, text]) //append text
            }
            if (!display.brightness) {
                display.brightness = 3 //default to brightness 3
            }

            let control = 0x00
            control |= display.rh_tally << 0
            control |= display.text_tally << 2
            control |= display.lh_tally << 4
            control |= display.brightness << 6

            bufUMD.writeUInt16LE(control, this._CONTROL)
        }
        //Calc length and write PBC
        let msgLength = Buffer.byteLength(bufUMD) - 2
        bufUMD.writeUInt16LE(msgLength, this._PBC)

        //Add DLE/STX and stuffing if needed
        if (sequence) {
            let packetBuf = Buffer.from([this._DLE, this._STX])

            for(let i = 0; i < bufUMD.length; i++) {
                if (bufUMD[i] == this._DLE) {
                    packetBuf = Buffer.concat([packetBuf, Buffer.from([this._DLE, this._DLE])])
                } else {
                    packetBuf = Buffer.concat([packetBuf, Buffer.from([bufUMD[i]])])
                }
            }
            return packetBuf

        } else {
            return bufUMD
        }
    }

    sendTallyUDP(ip, port, tally, sequence) {
        try {		
            if (!ip | !port | !tally){
                throw 'Missing Parameter from call sendTallyUDP()'
            }
            if (sequence == null) {
                debug('No DLE/STX sequence by default for UDP.')
                sequence = false
            }

            let msg = this.constructPacket(tally, sequence)

            let client = dgram.createSocket('udp4')
            
            client.send(msg, port, ip, function(error) {
                if (error) {
                    debug('Error sending TSL 5 UDP tally:', error)
                } else {
                    debug('TSL 5 UDP Data sent.')
                }
                client.close()
            });
        }
        catch (error) {
            debug('Error sending TSL 5 UDP tally:', error);
        }
    }

    sendTallyTCP(ip, port, tally, sequence) {
        try {		
            if (!ip | !port | !tally){
                throw 'Missing Parameter from call sendTallyTCP()'
            }
            if (sequence == null) {
                debug('Adding DLE/STX sequence by default for TCP.')
                sequence = true
            }

            let msg = this.constructPacket(tally, sequence)
            
            let client = new net.Socket()
            client.connect(port, ip);
            
            client.on('connect', () => {
                client.write(msg)
                client.end()
                client.destroy()
                debug('TSL 5 TCP Data sent.')

            })
            client.on('error', (error) => {
                debug('Error sending TSL 5 TCP tally:', error)
            })
        }
        catch (error) {
            debug('Error sending TSL 5 TCP tally:', error);
        }
    }
}

module.exports = TSL5
