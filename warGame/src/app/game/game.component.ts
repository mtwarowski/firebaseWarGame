import { AfterViewInit, Component, HostListener, Injectable, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AngularFireDatabase, FirebaseListObservable, FirebaseObjectObservable } from "angularfire2/database";
import { UserService } from "../user.service";
import { key_S, key_W, key_A, key_D, WAR_MACHINES_RES, SETTINGS_RES, key_Space } from "../global.constants";

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {

  constructor() {
   }

  ngOnInit() {
  }
}

@Component({
  selector: 'app-battlefield',
  template: `
  <div class="battefieldWrapper" #battefieldWrapper>
    <button *ngIf="!playerWarMachineObservable" (click)="addNewWarMachine()">Game on!</button>
    <canvas *ngIf="playerWarMachineObservable" class="gameCanvas" #gameCanvas></canvas>
  </div>
  `,
  styles:[`
    .battefieldWrapper{
      width:100%;
      height: 100%;
      overflow: hidden;
      background-color: azure;
    }

    .gameCanvas{
      overflow: hidden;
      background-color: white;
    }
  `]
})
export class BattlefieldComponent {

  // bulletImage: HTMLImageElement;
  // warMachineImage: HTMLImageElement;

  public warMachines: IWarMachine[];
  public warMachinesObservable: FirebaseListObservable<IWarMachine[]>;

  public warMachine: IWarMachine;
  public playerWarMachineObservable: FirebaseObjectObservable<IWarMachine>;

  private settings: IGameSettings;
  public settingsObservable: FirebaseObjectObservable<IGameSettings>;

  private gameControlBuffor: IGameControlBuffor = <IGameControlBuffor>{};

  @ViewChild('battefieldWrapper') battefieldWrapperViewChild;
  private gameCanvasViewChild: ElementRef;
  @ViewChild('gameCanvas') set content(content: ElementRef) {
    this.gameCanvasViewChild = content;

    if(this.gameCanvasViewChild && this.gameCanvasViewChild.nativeElement){
      this.fitGameCanvasToWrapper(this.gameCanvasViewChild.nativeElement, this.battefieldWrapperViewChild.nativeElement);
    }
  };
  
  private xTrans: number = 0;
  private yTrans: number = 2;

  constructor(public af: AngularFireDatabase, public userService: UserService) {
    this.gameControlBuffor.MoveForeward = false;
    this.gameControlBuffor.MoveBack = false;
    this.gameControlBuffor.RotateLeft = false;
    this.gameControlBuffor.RotateRight = false;
    this.warMachinesObservable = this.af.list(WAR_MACHINES_RES);
    this.warMachinesObservable.subscribe(newWarMachines => {
      this.warMachines = newWarMachines;
    });


    // this.warMachineImage = new Image();
    // this.bulletImage = new Image();

    // let bowImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADDElEQVRoQ+2ZQW7TQBSG/9cUFnTT3iDdgRyJsEOIpOYEDCdoOQHhBIUTACcgnIDpCZImCLEjlWLErukJIBJs2iQPjeUU27EnE3vcOFKzTCbj75/3Zv43z4QN/9CG8+NWQFERdJ6IOip4BWDP60uR9pxSRsBpiBYR3s2hhz2Zylk6AbWnwsUWOuEV3ygBTlOcE1CNpMwMz4ZfZDcpjUoVgfuPRXX7Ls5DoGPMINLg1bjSCKi6Yndnhg4B9WsBjNNhX7q6g6IUAhLhATAw8npyv9QCwvDMOCPCwzAwT/DI+yoHpTxG4/B/K3B3pmgT4fkcmBmvvb58XzoBSfCjrvxda4o3AI5DAk5KZ2Rp8Ao67gPL9sGNb2Id/HzVa03B4ZT5s4U9FZ21+4AJvB+FhuiCcHANXAYjM4VX0E5DqI18GFrxt8OeVHtj4XMjKbQKvB+B2EaeAR9+9GRrLQJWhVeQDxpCVAifTRy50AhkgU86iaApKQoTkBW+FALywK9dQF74tQqwAR8co5ErJTNSywlre8AWfJKR6Qo6KwKswifciSeX2P/5TY4K8QGb8MH5/xHArokHqDG5ImAL3mm+OCTmIxDi18cxT+AWcqHJCz9vXBFBNa3+r3goT5jx0uvLtvUrpQ142vZ7P4ngAMbMaC2Dz5RChcMzTnmKli5twhFZaQ/khU8pldXXasUlMdq6HlCuU8gGfFAq/wqnjq5U1uX+/DejCNiCXyiTAej6nlYE2IIPHLYTPiqZ8cnryyMT0LQx2gjYhE9afWjuuqaiEgWoJmvlDo4jZzRDXbTl5BInabae9tCgVaJuWMYOm1lAop3HZlO9GmIMQBgQU/fqii/iolT07k3pgMCCCPE0WeqwmQQE7e3vGoMxnVc7zsRhTR8USaGEdobpPMbjbMIvOLHTEDLWWPVrkaBucQkQkYaTMTbAjAtMIUwd1nTq1FNIbbw0V1S/MfkvIur+66BwFy1ajJ0Bap+s7rC5BZhOEB+nomV7la1Xo1nFFfE/o1KiiAfbmvNWgK2VzDrPxkfgH1oeKk/YunzzAAAAAElFTkSuQmCC";
    // let arrowImage = "data:image/png;base64,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";

    // this.warMachineImage.src = bowImage;
    // this.bulletImage.src = arrowImage;

    this.settingsObservable = this.af.object(SETTINGS_RES);
    this.settingsObservable.subscribe(newSettings => {
        this.battleFieldClock = new GameClock();
        this.settings = newSettings;

        if(this.timer){
          clearInterval(this.timer);
          this.timer = null;
        }

        this.timer = setInterval(() =>{
          this.battleFieldClock.update();
          this.battlefieldTick();
        } , this.settings.GAME_TICK_SPEED);
    });
  }
  

  battleFieldClock: GameClock;
  timer: any;
  addNewWarMachine(){

    let player = this.userService.getUserData();

    this.warMachine = <IWarMachine>{ 
      xpos: this.getRandon(this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE, this.settings.GAME_BATTLEFIELD_WIDTH), 
      ypos: this.getRandon(this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE, this.settings.GAME_BATTLEFIELD_HEIGHT), 
      angle: this.getRandon(0, 360),
      playerId: player.uid,
      playerName: player.displayName
    }; 
    var createdKey = this.warMachinesObservable.push(this.warMachine).key;

    this.playerWarMachineObservable = this.af.object(WAR_MACHINES_RES + createdKey);
    this.playerWarMachineObservable.subscribe((value: IWarMachine) => {
      this.warMachine = value;
    });
  
    this.onResize({});
  }

  updateWarMachine(newDataWarMachine: IWarMachine){
    if(this.playerWarMachineObservable){
      this.playerWarMachineObservable.update(newDataWarMachine);
    }
  }
  
  battlefieldTick(){
    if(!this.gameCanvasViewChild || !this.battefieldWrapperViewChild){
      return;
    }
    let gameCanvas = this.gameCanvasViewChild.nativeElement;

    this.updatePlayerWarMachinePosition();
    
    let ctx=this.getCleanContext(gameCanvas);
    ctx.save();
    this.setViewport(gameCanvas, ctx);
    this.drawBattleFieldBoundries(ctx);
    this.drawWarMachines(ctx);
    ctx.restore();
  }

  getCleanContext(gameCanvas: HTMLCanvasElement): CanvasRenderingContext2D{
    let ctx= gameCanvas.getContext("2d");
    //ctx.clearRect(0,0,this.settings.GAME_BATTLEFIELD_WIDTH, this.settings.GAME_BATTLEFIELD_HEIGHT);
    ctx.clearRect(0, 0, Math.max(this.settings.GAME_BATTLEFIELD_WIDTH, gameCanvas.width+this.xTrans), Math.max(this.settings.GAME_BATTLEFIELD_HEIGHT, gameCanvas.height+this.yTrans));
    return ctx;
  }

  drawBattleFieldBoundries(ctx: CanvasRenderingContext2D){

    ctx.strokeStyle="#FF0000";
    ctx.lineWidth = this.settings.GAME_BATTLEFIELD_LINE_WIDTH;
    ctx.strokeRect(0,0,this.settings.GAME_BATTLEFIELD_WIDTH, this.settings.GAME_BATTLEFIELD_HEIGHT);
    ctx.closePath();
  }

  drawWarMachines(ctx: CanvasRenderingContext2D){
    if(!this.warMachines){
      return;
    }

    this.warMachines.forEach(currentWarMachine => {
      
      //draw circle
      ctx.beginPath();
      ctx.arc(currentWarMachine.xpos, currentWarMachine.ypos, this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(34, 0, 204, 0.8)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(51, 129, 255, 0.8)';
      ctx.stroke();


      //draw direction line
      ctx.beginPath();
      ctx.moveTo(currentWarMachine.xpos, currentWarMachine.ypos);
      let vector = Vector2d.getVectorFromDistanceAndAngle(this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE, currentWarMachine.angle);
      ctx.lineTo(currentWarMachine.xpos + vector.x, currentWarMachine.ypos + vector.y);
      ctx.stroke();
    });
  }

  setViewport(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    let biggerDimention = canvas.width > canvas.height ? canvas.width : canvas.height;
    biggerDimention *= 0.1;

    // this.xTrans = this.xTrans > this.warMachine.xpos ? this.warMachine.xpos : this.xTrans;
    // this.yTrans = this.yTrans > this.warMachine.ypos ? this.warMachine.ypos : this.yTrans;

    // //move viewport up if need top 
    if(biggerDimention > this.warMachine.xpos - this.xTrans){
      this.xTrans = this.warMachine.xpos - biggerDimention;
    }
    
    // //move viewport up if need left
    if(biggerDimention > this.warMachine.ypos - this.yTrans){
      this.yTrans = this.warMachine.ypos - biggerDimention;
    }

    //player off screen to right
    if(canvas.width - biggerDimention < this.warMachine.xpos - this.xTrans){
      this.xTrans = this.warMachine.xpos - canvas.width + biggerDimention;
    }

    //player off screen to low
    if(canvas.height - biggerDimention < this.warMachine.ypos - this.yTrans){
      this.yTrans = this.warMachine.ypos - canvas.height + biggerDimention;
    }

    ctx.translate(-this.xTrans, -this.yTrans);
  }

  updatePlayerWarMachinePosition() {
    if(!this.warMachine){
      return;
    }

    let distance = this.battleFieldClock.ElapsedSeconds;

    //process Rotation
    let rotationDirection = 0;
    if(this.gameControlBuffor.RotateLeft && !this.gameControlBuffor.RotateRight){
      rotationDirection = 1;
    }

    if(!this.gameControlBuffor.RotateLeft && this.gameControlBuffor.RotateRight){
      rotationDirection = -1;
    }
    this.warMachine.angle += ( distance * this.settings.GAME_ROTATE_SPEED * rotationDirection);


    //process movement
    let moveDirection = 0;
    if(this.gameControlBuffor.MoveBack && !this.gameControlBuffor.MoveForeward){
      moveDirection = -1;
    }

    if(!this.gameControlBuffor.MoveBack && this.gameControlBuffor.MoveForeward){
      moveDirection = 1;
    }

    let vector = Vector2d.getVectorFromDistanceAndAngle(distance * this.settings.GAME_MOVE_SPEED * moveDirection, this.warMachine.angle);

    this.warMachine.xpos += vector.x;
    this.warMachine.ypos += vector.y;

    if(this.warMachine.xpos - this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE <= 0){
      this.warMachine.xpos = this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE;
    }
    
    if(this.warMachine.xpos + this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE >= this.settings.GAME_BATTLEFIELD_WIDTH){
      this.warMachine.xpos = this.settings.GAME_BATTLEFIELD_WIDTH - this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE;
    }

    if(this.warMachine.ypos - this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE <= 0){
      this.warMachine.ypos = this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE;
    }
    
    if(this.warMachine.ypos + this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE >= this.settings.GAME_BATTLEFIELD_HEIGHT){
      this.warMachine.ypos = this.settings.GAME_BATTLEFIELD_HEIGHT - this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE;
    }

    this.updateWarMachine(this.warMachine);
  }


  resizeTimer: any;
  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if(!this.gameCanvasViewChild || !this.battefieldWrapperViewChild){
      return;
    }
    let gameCanvas = this.gameCanvasViewChild.nativeElement;
    let battlefieldWrapper = this.battefieldWrapperViewChild.nativeElement;
    gameCanvas.width = 0;
    gameCanvas.height = 0;

    if(this.resizeTimer){
      clearTimeout(this.resizeTimer);
    }    
    this.resizeTimer = setTimeout(() => {    
      this.fitGameCanvasToWrapper(gameCanvas, battlefieldWrapper);
    }, 50);
  }

  fitGameCanvasToWrapper(canvas: HTMLCanvasElement, battlefieldWrapper: HTMLDivElement){
      //fitting canvas to take full size
      if(battlefieldWrapper.offsetWidth != canvas.width){
        canvas.width = battlefieldWrapper.offsetWidth;
      }
      
      if(battlefieldWrapper.offsetHeight != canvas.height){
        canvas.height = battlefieldWrapper.offsetHeight;
      }
  }

  @HostListener('window:keydown', ['$event'])
  keydown(event: KeyboardEvent) {

    if(event.keyCode == key_W){
      this.gameControlBuffor.MoveForeward = true;
    }

    if(event.keyCode == key_S){
      this.gameControlBuffor.MoveBack = true;
    }

    if(event.keyCode == key_A){
      this.gameControlBuffor.RotateLeft = true;
    }
    
    if(event.keyCode == key_D){
      this.gameControlBuffor.RotateRight = true;
    }

    if(event.keyCode == key_Space){
      this.gameControlBuffor.Shoot = true;
    }
  }


  @HostListener('window:keyup', ['$event'])
  keyup(event: KeyboardEvent) {

    if(event.keyCode == key_W){
      this.gameControlBuffor.MoveForeward = false;
    }

    if(event.keyCode == key_S){
      this.gameControlBuffor.MoveBack = false;
    }

    if(event.keyCode == key_A){
      this.gameControlBuffor.RotateLeft = false;
    }

    if(event.keyCode == key_D){
      this.gameControlBuffor.RotateRight = false;
    }

    if(event.keyCode == key_Space){
      this.gameControlBuffor.Shoot = false;
    }
  }


  // @HostListener('window:mouseup', ['$event'])
  // mouseUp(event){
  // }

  // @HostListener('window:mousemove', ['$event'])
  // mouseMove(event){
  // }

  private getRandon(min: number, max: number): number {
    return Math.floor(Math.random() * max) + min;
  }
}

export interface IWarMachine{
  $key: string;
  xpos: number;
  ypos: number;
  angle: number;
  playerId: string;
  playerName: string;
}


export class GameClock{
  public ElapsedSeconds : number;
  private updatedDate: Date;

  constructor(){
    this.updatedDate = new Date();
  }

 update(){
    var currentDate = new Date();

    var dif = currentDate.getTime() - this.updatedDate.getTime();
    this.ElapsedSeconds = dif / 1000;
    this.updatedDate = currentDate;
  }

}

export class Vector2d{
  x: number;
  y: number;

  constructor(xValue: number, yValue: number){
    this.x = xValue;
    this.y = yValue;
  }

  multiplyByScalar(value: number){
    this.x *= value;
    this.y *= value;
  }

  static getVectorFromDistanceAndAngle(distance: number, angle: number): Vector2d{
    let vecX = Math.sin(angle) * distance;
    let vecY = Math.cos(angle) * distance;
    return new Vector2d(vecX, vecY);
  }
}

export interface IGameControlBuffor{
  MoveForeward: boolean;
  MoveBack: boolean;
  RotateLeft: boolean;
  RotateRight: boolean;
  Shoot: boolean;
}

export interface IGameSettings{
  GAME_TICK_SPEED: number;
  GAME_MOVE_SPEED: number;
  GAME_ROTATE_SPEED: number;

  GAME_BATTLEFIELD_WIDTH: number;
  GAME_BATTLEFIELD_HEIGHT: number;
  GAME_BATTLEFIELD_LINE_WIDTH: number;
  GAME_BATTLEFIELD_WAR_MACHINE_SIZE: number;
  GAME_BATTLEFIELD_BULLET_SIZE: number;
}