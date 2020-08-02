
//NodeImports
import * as THREE from 'three';

//LocalImports
import * as PIECE from './entities/Piece/PlayerPiece'
import * as BOARD from './entities/Board/board'
import * as CM from '../Controls/ControlManager'
import * as NETWORK from '../Network/ClientNetwork'
import * as TYPES from '../Util/types'
import * as EXT from '../Util/ThreeExtension'
import * as BLOCK from './entities/Block/Block'

import * as T from '../Util/types';

interface GameState{
    movPlayerDown
}
  
interface GameTimeVariables{
    secondsPerTick:number,
    syncTime: number, // the time we get from the server, and is updated every call to UPDATE
    previousTime: number, //the time we use to determine whether we have passed a secondsPerTick threshhold value
    secondsSinceLastUpdate:number
}

export class Game {
    
    public network: T.NetworkInfo;
    scene: THREE.Scene;

    //Tetris
    currentPiece: PIECE.Piece;
    gameState: GameState;
    gameTimeVariables: GameTimeVariables;
    clientId: string;

    constructor(){

        this.scene = new THREE.Scene();
        this.network = <T.NetworkInfo>{};

        this.gameState = {
            //when true, the game will force the player to move down
            movPlayerDown:false
        }
        // default game values
        this.currentPiece = null;
        //gameTime
        this.gameTimeVariables = {
            secondsPerTick: 2,
            syncTime: 0,
            previousTime: 0,
            secondsSinceLastUpdate: 0
        }

        this.init();

    }

    public setClientId( clientId:string ){
        this.clientId = clientId;
    }

    init(){
        // SETUP GAME
        const frame = BOARD.frame();
        frame.position.add(new THREE.Vector3(-5, 0, 0));
        this.scene.add(BOARD.levelFloor()); // grpimd
        this.scene.add(BOARD.sky());
        this.scene.add(frame);
    }

    public update(controlManager:CM.ControlManager){

      this.syncGame();

    }

    private oldUpdate(totalTime){

      
      //this.syncGame();
      // if(this.currentPiece===null){
        
      // }


      //console.log("hello! " +totalTime );
     


        //console.log(this.gameTimeVariables);
        //console.log(controlManager);

        
        // if (this.currentPiece!==null) {
        //     //this.currentPiece.update(); //update our current piece so we get all the collision
        //     if(this.gameState.movPlayerDown ===true){
        //         this.forceDown(network)
        //         this.gameState.movPlayerDown=false;
        //     }else{
        //         controlManager.processCommand();
        //     }
        // }


        // //changes the game state based on the number of ticks.
        // if(this.gameTimeVariables.syncTime%this.gameTimeVariables.secondsPerTick===0){
        //     this.gameTimeVariables.secondsSinceLastUpdate = this.gameTimeVariables.syncTime - this.gameTimeVariables.previousTime;
        //     if(this.gameTimeVariables.secondsSinceLastUpdate!==0){
        //         this.gameTimeVariables.previousTime = this.gameTimeVariables.syncTime;//update the previous time we did this
        //         this.gameState.movPlayerDown=true;
        //     }
        // }

    }

    public updateNetworkInfo(info: T.NetworkInfo){
      console.log("updateNetworkInfo(info: T.NetworkInfo)");
      console.log(info);
      if(info.clientId!==undefined){
        this.network.clientId = info.clientId;
        this.clientId = info.clientId;
      }
        

      if(info.persistentBlocks!==undefined)
        this.network.persistentBlocks = info.persistentBlocks;
      if(info.serverTime!==undefined)
        this.network.serverTime = info.serverTime;
      if(info.users!==undefined)
        this.network.users = info.users;
    }

    //Tetris
    forceDown(network:NETWORK.ClientNetwork){
        if(this.currentPiece!==null){
          const info = {};
          if(this.currentPiece.collision_isBlocked.down===true){
            //set the piece
            info['player'] = this.clientId;
            info['color'] = this.currentPiece.color;
            info['blocks'] = getRotatedBlocksFromMesh(this.currentPiece.mesh);
            info['blocks'] = bakeInOrigin(info['blocks'], this.currentPiece.mesh.position);
            network.socket.emit('set_blocks', info);
            this.currentPiece = null;
          }else{
            // @ts-ignore
            info.id = this.clientId;
            // @ts-ignore
            info.dir = 'down';
            network.socket.emit('forceDown', JSON.stringify(info));
            //move the piece
          }
        }

    }

    //Tetris
    resetGame(){

        // let inActivePieces = this.scene.children.filter((child)=>{
        //   return child.userData.entityType==='inactive_piece';
        // });
        // //console.log(inActivePieces);
        // inActivePieces.forEach((piece)=>{
        //   this.scene.remove(piece);
        // })

    }

    //modifies positions so they are current with the network
    private syncGame(){

      this.handleLocalPlayer(this.network.users);

      //this.handleNetworkedPlayers(users);

    
      this.handlePersistantPieces();

    }

    private handleLocalPlayer(users:TYPES.Client[]){

      let networkUserMap = new Map(this.network.users.map(i=>[i.id,i]));

      if(this.currentPiece===null){
        let currentUserNetworkInfo = networkUserMap.get(this.clientId);
        console.log(currentUserNetworkInfo);

      }else{
        //update the local players piece position
      }

    }

    private handleNetworkedPlayers(users:TYPES.Client[]){

    }

    private handlePersistantPieces(){
      let persistentBlocks = this.network.persistentBlocks;
      
      let networkPieceMap = new Map(persistentBlocks.map(i=>[i.uuid,i]));
      let localPieceMap = new Map(this.scene.children.map(i=>[i.userData.owner,i]));
        
      //Make sure everything on the server is in the local scene
      persistentBlocks.forEach((block)=>{
        if(!localPieceMap.has(block.uuid)){
          console.log("Creating block");
          //create the block in the scene
          let userData = <T.UserData>{};
          userData.entityType = "persistentBlock"
          userData.owner = block.uuid;
          BLOCK.createBlock(this.scene,userData,block.color,block.position);
        }          
      });

      //removes anything local thats not in the server
      this.scene.children.forEach(child=>{
        if(child.userData.entityType === 'persistentBlock'){  
          if(!networkPieceMap.has(child.userData.owner)){
            this.scene.remove(child);
          }
        }
      })
    }



    
}

const bakeInOrigin = (blocks:THREE.Vector3[], origin:THREE.Vector3) => {
  blocks.forEach((block) => {
    block.x += origin.x;
    block.y += origin.y;
    block.z += origin.z;
  });
  return blocks;
}

const calRotMatZaxis = (radians:number):THREE.Matrix4 => {
  let m = new THREE.Matrix4();
  m.set(Math.cos(radians),-Math.sin(radians),0,0,
  Math.sin(radians),Math.cos(radians),0,0,
            0,0,1,0,
            0,0,0,1);
  return m;
}

export const getRotatedBlocksFromMesh = (mesh:THREE.Object3D) => {
  //we rotate around the z
  let m = calRotMatZaxis(mesh.rotation.z);
  let blocks= [];
  for(let i = 0;i< mesh.children.length;i++){
    let newVec = new THREE.Vector3(
      mesh.children[i].position.x,
      mesh.children[i].position.y,
      mesh.children[i].position.z);
    newVec = newVec.applyMatrix4(m);
    newVec.x = Math.round(newVec.x*1000)/1000;
    newVec.y = Math.round(newVec.y*1000)/1000;
    newVec.z = Math.round(newVec.z*1000)/1000;
    let block = new THREE.Vector3(newVec.x,newVec.y,newVec.z);
    blocks.push(block);
  }
  return blocks;
}