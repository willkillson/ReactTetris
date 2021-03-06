import * as SOCKET from 'socket.io';
import * as QUEUE from '../utilities/DataTypes/Queue'
import * as COMMAND from '../Controls/Command'
import * as CLIENT from '../Entities/Client';
import * as THREE from 'three';
import * as BLOCK from '../Entities/Block'
import * as SERVER from '../Server'

import { Color } from 'three';
import { receiveMessageOnPort } from 'worker_threads';

/**
 * Each player will have a queue of commands. A call to poll commands will retrieve one
 * command per player if they have any commands queued up. This is to ensure that a player
 * can only issue one command per server "frame", or unit of time.
 */
export class NetworkControlManager {

    //Each player will have their own queue that contains commands
    private players: Map<string,QUEUE.Queue<COMMAND.Command<THREE.Vector3>>>;
    
    private server:SERVER.default;

    constructor(server:SERVER.default){
        this.server = server;
        this.players = new Map();
    }

    public addPlayer(uuid:string){
        this.players.set(uuid,new QUEUE.Queue());
    }

    public removePlayer(uuid:string){
        this.players.delete(uuid);
    }

    public contains(uuid:string):boolean{
        return this.players.has(uuid);
    }

    public addCommand( cmd: COMMAND.Command<THREE.Vector3> ){
        
        this.players.get(cmd.owner).enqueue(cmd);
    }

    /**
     */
    public pollAndProcessCommands( users: CLIENT.Client[] ){  
        Array.from(this.players.keys())
        .forEach(player=>{
            let cmd = this.players.get(player).dequeue();
            if(cmd!==undefined){
                //find the player
                let index = users.findIndex(usr=>{ return usr.id===player});
                switch(cmd.cmdType){
                    case 'movement':
                      users[index].position.add(cmd.cmdValue);
                      this.server.userSockets.get(player).emit('freeControls');
                      break;
                    case 'rotation':
                      users[index].rotation.add(cmd.cmdValue);
                      this.server.userSockets.get(player).emit('freeControls');
                      break;
                    case 'setPiece':
                      this.server.setPiece(
                          // @ts-ignore
                          cmd.cmdValue.blocks,
                          // @ts-ignore
                        cmd.cmdValue.color,
                        cmd.owner);
                        this.server.userSockets.get(player).emit('clearWaitingFlag');
                        
                      break;
                      case 'reset':
                          this.server.persistentBlocks = [];
                          break;
                  }
            }
  
        });  
    }




}