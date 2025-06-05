import { Component, OnInit } from '@angular/core';
import { HomeAssistant } from '../../../core/home-assistant';
import {MatCard, MatCardContent, MatCardTitle} from '@angular/material/card';
import {MatSlideToggle} from '@angular/material/slide-toggle';

@Component({
  selector: 'app-lamp-toggle',
  standalone: true,
  templateUrl: './lamp-toggle.html',
  imports: [
    MatCard,
    MatCardTitle,
    MatCardContent,
    MatSlideToggle
  ],
  styleUrls: ['./lamp-toggle.scss']
})
export class LampToggleComponent implements OnInit {
  lampState: boolean = false;
  loading: boolean = false;
  readonly entityId = 'light.wiz_tunable_white_640190';

  constructor(private ha: HomeAssistant) {}

  ngOnInit(): void {
    this.loadState();
  }

  loadState(): void {
    this.ha.getState(this.entityId).subscribe(data => {
      this.lampState = data.state === 'on';
    });
  }

  toggleLamp(): void {
    this.loading = true;
    const service = this.lampState ? 'turn_off' : 'turn_on';
    this.ha.callService('light', service, this.entityId).subscribe(() => {
      this.lampState = !this.lampState;
      this.loading = false;
    });
  }
}
