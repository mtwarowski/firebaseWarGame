import { Component, OnInit, HostListener, Injectable, Pipe } from '@angular/core';
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


@Component({
  selector: 'app-battlefield',
  template: ` 
  <button *ngIf="!playerWarMachineObservable" (click)="addNewWarMachine()">Game on!</button>
  <div *ngIf="playerWarMachineObservable">
    <svg width="1000" height="1000">
      <circle *ngFor="let currentWarMachine of warMachinesObservable | async"  [attr.cx]="currentWarMachine.xpos" [attr.cy]="currentWarMachine.ypos" r="10" stroke="green" stroke-width="4" fill="yellow" />
    </svg>

    <canvas class="gameField"></canvas>
  </div>
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
  public warMachinesObservable: FirebaseListObservable<WarMachine[]>;
  public playerWarMachineObservable: FirebaseObjectObservable<WarMachine>;
  public settingsObservable: FirebaseObjectObservable<IGameSettings>;
  public warMachine: WarMachine;
  private gameControlBuffor: IGameControlBuffor = <IGameControlBuffor>{};
  private settings: IGameSettings;

  constructor(public af: AngularFireDatabase) {
    this.gameControlBuffor.MoveForeward = false;
    this.gameControlBuffor.MoveBack = false;
    this.gameControlBuffor.RotateLeft = false;
    this.gameControlBuffor.RotateRight = false;
    this.warMachinesObservable = this.af.list(WAR_MACHINES_RES);
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
    this.warMachine = <WarMachine>{ xpos: 50, ypos: 50, angle: 0 }; 
    var createdKey = this.warMachinesObservable.push(this.warMachine).key;

    
      this.playerWarMachineObservable = this.af.object(WAR_MACHINES_RES + createdKey);
      this.playerWarMachineObservable.subscribe((value: WarMachine) => {
        this.warMachine = value;
      });
  }

  updateWarMachine(newDataWarMachine: WarMachine){
    if(this.playerWarMachineObservable){
      this.playerWarMachineObservable.update(newDataWarMachine);
    }
  }
  
  battlefieldTick(){
    this.drawBattleFieldBoundries();
    this.updatePlayerWarMachinePosition();
  }

  drawBattleFieldBoundries(){

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

export interface WarMachine{
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
}
