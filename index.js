const dgram        = require('dgram')
const debug        = require('debug')('tsl-umd-v5')
const EventEmitter = require('events');

class TSL5 extends EventEmitter {
    constructor () {
        super()
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
        this.server = dgram.createSocket('udp4')
        this.server.bind(port)

        this.server.on('message',(msg, rinfo) => {
            this.processTally(msg,rinfo)
            debug('Message recieved: ', msg)
        })

        this.server.on('listening', () => {
            var address = this.server.address();
            debug(`server listening ${address.address}:${address.port}`);
        });

        this.server.on('error', (err) => {
            debug('server error: ', err);
            throw err;
        });
    }

    processTally(data,rinfo) {
        let buf = Buffer.from(data)
        let tally = { display: {} }

        tally.sender  = rinfo.address
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

        this.emit('message',tally)
    }

    constructPacket(tally) {
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

        return bufUMD
    }

    sendTallyUDP(ip, port, tally) {
        try {		
            if (!ip | !port | !tally){
                throw 'Missing Parameter from call sendTSL5_UDP()'
            }
            let msg = this.constructPacket(tally)
    
            let client = dgram.createSocket('udp4');
            
            client.send(msg, port, ip, function(error) {
                if (!error) {
                    debug('TSL 5 UDP Data sent.', 'info');
                }
                client.close();
            });
        }
        catch (error) {
            debug(`An error occured sending the TSL 5 UDP Message: ${error}`, 'error');
        }
    }
}

module.exports = TSL5
