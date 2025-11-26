import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { RoomMenuComponent } from './room-menu-component';

describe('RoomMenuComponent', () => {
  let component: RoomMenuComponent;
  let fixture: ComponentFixture<RoomMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomMenuComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({})
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
