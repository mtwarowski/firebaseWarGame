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
      background-color: blue;
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

  @ViewChild('battefieldWrapper') battefieldWrapperViewChild;
  //@ViewChild('gameCanvas') gameCanvasViewChild;

  private gameCanvasViewChild: ElementRef;
  @ViewChild('gameCanvas') set content(content: ElementRef) {
    this.gameCanvasViewChild = content;

    if(this.gameCanvasViewChild && this.gameCanvasViewChild.nativeElement){
      this.fitGameCanvasToWrapper(this.gameCanvasViewChild.nativeElement, this.battefieldWrapperViewChild.nativeElement);
    }
  };
  private gameCanvas: HTMLCanvasElement;
  
  private xTrans: number = 20; 
  private yTrans: number = 20;

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
    this.warMachine = <IWarMachine>{ 
      xpos: this.getRandon(this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE, this.settings.GAME_BATTLEFIELD_WIDTH), 
      ypos: this.getRandon(this.settings.GAME_BATTLEFIELD_WAR_MACHINE_SIZE, this.settings.GAME_BATTLEFIELD_HEIGHT), 
      angle: this.getRandon(0, 360)
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
    //ctx.clearRect(0,0,this.settings.GAME_BATTLEFIELD_WIDTH, this.settings.GAME_BATTLEFIELD_HEIGHT);
    ctx.clearRect(0, 0, this.gameCanvas.width+this.xTrans, this.gameCanvas.height+this.yTrans);
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
    this.gameCanvas = this.gameCanvasViewChild.nativeElement;
    let battlefieldWrapper = this.battefieldWrapperViewChild.nativeElement;
    this.gameCanvas.width = 0;
    this.gameCanvas.height = 0;

    if(this.resizeTimer){
      clearTimeout(this.resizeTimer);
    }    
    this.resizeTimer = setTimeout(() => {    
      this.fitGameCanvasToWrapper(this.gameCanvas, battlefieldWrapper);
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