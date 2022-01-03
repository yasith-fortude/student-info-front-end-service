import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  socket: any;

  constructor() {
    // initialize socket connection to notify-service
    this.socket = io('http://localhost:3002');

    this.socket.on('connect', () => {
      console.log('Websocket connected');
    });

  }

  // special socket event receive method
  listenObservable(eventName: string) {
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data: any) => {
        subscriber.next(data);
        console.log(data);
      })
    });
  }

  // socket event send method
  emit(eventName: string, data:any) {
    this.socket.emit(eventName, data);
  }

  // socket event send & receive method
  emitAndRecieve(eventName: string, data:any) {
    this.socket.emit(eventName, data, (responseData: any) => {
      console.log(responseData);
    });
  }
}
