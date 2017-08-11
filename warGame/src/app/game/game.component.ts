import { Component, OnInit, AfterViewInit, HostListener, Injectable, Pipe, ViewChild } from '@angular/core';
import { AngularFireDatabase, FirebaseListObservable, FirebaseObjectObservable } from "angularfire2/database";
import { UserService } from "../user.service";
import { key_S, key_W, key_A, key_D, WAR_MACHINES_RES, SETTINGS_RES } from "../global.constants";

export enum GameAction{
  MoveForeward,
  MoveBack,
  RotateLeft,
  RotateRight,
  // Shoot,
}


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
// <svg width="1000" height="1000">
//   <circle *ngFor="let currentWarMachine of warMachinesObservable | async"  [attr.cx]="currentWarMachine.xpos" [attr.cy]="currentWarMachine.ypos" r="10" stroke="green" stroke-width="4" fill="yellow" />
// </svg>

@Component({
  selector: 'app-battlefield',
  template: ` 
  <button *ngIf="!playerWarMachineObservable" (click)="addNewWarMachine()">Game on!</button>
  <canvas *ngIf="playerWarMachineObservable" class="gameField" #gameCanvas></canvas>
  `,
  styles:[`
    .gameField{
      overflow: hidden;
      width: 100%;
      height: 100%;
    }
  `]
})
export class BattlefieldComponent {

  public warMachines: IWarMachine[];
  public warMachinesObservable: FirebaseListObservable<IWarMachine[]>;

  public warMachine: IWarMachine;
  public playerWarMachineObservable: FirebaseObjectObservable<IWarMachine>;

  private settings: IGameSettings;
  public settingsObservable: FirebaseObjectObservable<IGameSettings>;

  private gameControlBuffor: IGameControlBuffor = <IGameControlBuffor>{};

  @ViewChild('gameCanvas') gameCanvasViewChild;
  gameCanvas: HTMLCanvasElement;
  
  xTrans = 20; 
  yTrans = 20;

  constructor(public af: AngularFireDatabase) {
    this.gameControlBuffor.MoveForeward = false;
    this.gameControlBuffor.MoveBack = false;
    this.gameControlBuffor.RotateLeft = false;
    this.gameControlBuffor.RotateRight = false;
    this.warMachinesObservable = this.af.list(WAR_MACHINES_RES);
    this.warMachinesObservable.subscribe(newWarMachines => {
      this.warMachines = newWarMachines;
    });

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
    this.warMachine = <IWarMachine>{ xpos: 50, ypos: 50, angle: 0 }; 
    var createdKey = this.warMachinesObservable.push(this.warMachine).key;

    
      this.playerWarMachineObservable = this.af.object(WAR_MACHINES_RES + createdKey);
      this.playerWarMachineObservable.subscribe((value: IWarMachine) => {
        this.warMachine = value;
      });
  }

  updateWarMachine(newDataWarMachine: IWarMachine){
    if(this.playerWarMachineObservable){
      this.playerWarMachineObservable.update(newDataWarMachine);
    }
  }
  
  battlefieldTick(){
    if(!this.gameCanvasViewChild){
      return;
    }

    this.gameCanvas = this.gameCanvasViewChild.nativeElement;

    this.updatePlayerWarMachinePosition();
    
    let ctx=this.getCleanContext();
    ctx.save();
    this.setViewport(this.gameCanvas, ctx);

    this.drawBattleFieldBoundries(ctx);
    this.drawWarMachines(ctx);
    ctx.restore();
  }

  getCleanContext(): CanvasRenderingContext2D{
    let ctx=this.gameCanvas.getContext("2d");
    ctx.clearRect(0,0,this.settings.GAME_BATTLEFIELD_WIDTH, this.settings.GAME_BATTLEFIELD_HEIGHT);
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
      ctx.beginPath();
      ctx.arc(currentWarMachine.xpos, currentWarMachine.ypos, this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'green';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#003300';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(currentWarMachine.xpos, currentWarMachine.ypos);
      let vector = Vector2d.getVectorFromDistanceAndAngle(this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE, currentWarMachine.angle);
      ctx.lineTo(currentWarMachine.xpos + vector.x, currentWarMachine.ypos + vector.y);
      ctx.stroke();
    });
  }

  setViewport(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    
    // //move viewport up if need to or left
    this.xTrans = this.xTrans > this.warMachine.xpos ? this.warMachine.xpos : this.xTrans;
    this.yTrans = this.yTrans > this.warMachine.ypos ? this.warMachine.ypos : this.yTrans;

    //player off screen to low
    if(canvas.width < this.warMachine.xpos - this.xTrans){
      this.xTrans = this.warMachine.xpos - canvas.width;
    }

    //player off screen to low
    if(canvas.height < this.warMachine.ypos - this.yTrans){
      this.yTrans = this.warMachine.ypos - canvas.height;
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
      rotationDirection = -1;
    }

    if(!this.gameControlBuffor.RotateLeft && this.gameControlBuffor.RotateRight){
      rotationDirection = 1;
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

    this.updateWarMachine(this.warMachine);
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
  }


  // @HostListener('window:mouseup', ['$event'])
  // mouseUp(event){
  // }

  // @HostListener('window:mousemove', ['$event'])
  // mouseMove(event){
  // }
}

export interface IWarMachine{
  $key: string;
  xpos: number;
  ypos: number;
  angle: number;
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
}

export interface IGameSettings{
  GAME_TICK_SPEED: number;
  GAME_MOVE_SPEED: number;
  GAME_ROTATE_SPEED: number;

  GAME_BATTLEFIELD_WIDTH: number;
  GAME_BATTLEFIELD_HEIGHT: number;
  GAME_BATTLEFIELD_LINE_WIDTH: number;
  GAME_BATTLEFIELD_WAR_MACHINE_SIZE: number;
}
