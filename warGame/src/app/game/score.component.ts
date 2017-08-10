import { Component } from "@angular/core";
import { FirebaseListObservable, AngularFireDatabase } from "angularfire2/database";
import { SCORES_RES } from "../global.constants";

@Component({
  selector: 'app-score',
  template: `  
<div class="scoreBoard" *ngFor="let score of scoresObservable | async">
  <div>{{score.userName}}: {{score.value}}</div>
</div>
  `,
  styles: [`
    .scoreBoard{
        height: 100%;
        width: 100%;
    }
  `]
})
export class ScoreComponent {

  scoresObservable: FirebaseListObservable<Score[]>;

  constructor(public af: AngularFireDatabase) {
      this.scoresObservable = this.af.list(SCORES_RES);
   }
}

export interface Score{
  userName: string;
  value: number;
}