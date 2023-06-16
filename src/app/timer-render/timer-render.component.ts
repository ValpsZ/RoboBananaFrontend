import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-timer-render',
  templateUrl: './timer-render.component.html',
  styleUrls: ['./timer-render.component.scss']
})
export class TimerRenderComponent implements OnInit {

  predictionTimer: string = "00:00"
  timerInterval: NodeJS.Timer | undefined;

  constructor() { }

  ngOnInit(): void {
    let streamURL = decodeURIComponent(window.location.search);
    streamURL = streamURL.slice(1, streamURL.length - 1);
    streamURL += "?channel=timer"
    var source = new EventSource(streamURL);
    source.addEventListener('open', (e) => {
      console.log("The connection has been established.");
    });
    source.addEventListener('publish', (event) => {
      var data = JSON.parse(event.data);
      console.log(data);
      clearInterval(this.timerInterval);
      this.startTimer(data.time);
    }, false);
    source.addEventListener('error', function (event) {
      console.log(event)
    }, false);
  }

  private startTimer(timeLeft: number) {
    const now = new Date();
    const later = now.getTime() + 1000 * timeLeft;


    let timer = Math.round((later - now.getTime()) / 1000);

    let minutes;
    let seconds;
    let hours;
    const updateTimer = () => {
      hours = Math.floor(timer / 3600);
      minutes = Math.floor(timer / 60) % 60;
      seconds = timer % 60;

      hours = hours < 10 ? "0" + hours : hours;
      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;

      if (hours !== '00') {
        this.predictionTimer = hours + ":" +  minutes + ":" + seconds;
      } else {
        this.predictionTimer = minutes + ":" + seconds;
      }

      if (--timer < 0) {
        timer = 0;
        clearInterval(this.timerInterval);
      }
    }
    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  }
}