import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from "@angular/router";
import { AppComponent } from './app.component';
import { AngularFireModule } from 'angularfire2';
import { AngularFireDatabaseModule } from 'angularfire2/database';
import { AngularFireAuthModule } from 'angularfire2/auth';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MdButtonModule, MdCardModule, MdMenuModule, MdToolbarModule, MdIconModule } from '@angular/material';
import { FormsModule } from "@angular/forms";
import { HttpModule } from "@angular/http";
import {FlexLayoutModule} from "@angular/flex-layout";

import { LoggedInGuard } from "./loggedIn.guard";

import { GameComponent, BattlefieldComponent } from './game/game.component';
import { ScoreComponent } from './game/score.component';
import { LoginComponent } from "./login/login.component";
import { UserService } from "./user.service";
import { firebaseConfig } from "./firebase.config";


const appRoutes: Routes = [
  { path: 'game', component: GameComponent, canActivate: [ LoggedInGuard ] },
  { path: 'login', component: LoginComponent },
  { path: '',   redirectTo: '/game', pathMatch: 'full' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes),
    BrowserModule,
    FormsModule,
    HttpModule,
    BrowserAnimationsModule,
    MdButtonModule,
    MdMenuModule,
    MdCardModule,
    MdToolbarModule,
    MdIconModule,
    FlexLayoutModule,
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
  ],
  declarations: [ AppComponent, GameComponent, ScoreComponent, BattlefieldComponent, LoginComponent ],
  bootstrap: [ AppComponent ],
  providers: [ LoggedInGuard, UserService ]
})
export class AppModule {}