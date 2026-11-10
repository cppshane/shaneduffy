import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  ServerModule
} from "@angular/platform-server";

import { AppModule } from './app.module';
import { AppComponent } from './app.component';
import { NavComponent } from './components/nav/nav.component';
import { ServerApiInterceptor } from './services/server-api.interceptor';

@NgModule({
  imports: [
    AppModule,
    ServerModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: ServerApiInterceptor, multi: true }
  ],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
