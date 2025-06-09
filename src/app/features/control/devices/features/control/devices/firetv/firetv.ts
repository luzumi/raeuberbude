import { Component } from '@angular/core';
import {Entity, HomeAssistant} from '../../../../../../../core/home-assistant';
import {filter} from 'rxjs';
import {HomeAssistantEntityUtils} from '../../../../../../../core/home-assistant-utils';

@Component({
  selector: 'app-firetv',
  standalone: true,
  imports: [],
  templateUrl: './firetv.html',
  styleUrl: './firetv.scss'
})
export class Firetv {
  //fireTv: Entity;

  constructor(private hass: HomeAssistant, private haeu: HomeAssistantEntityUtils) {
    console.log(this.hass.getEntitiesSnapshot().filter(e=> e.entity_id.includes('fire')));
  }


}
