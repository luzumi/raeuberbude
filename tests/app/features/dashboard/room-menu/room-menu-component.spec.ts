import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomMenuComponent } from 'src/app/features/dashboard/room-menu/room-menu-component'; // path adjusted after moving tests

describe('RoomMenuComponent', () => {
  let component: RoomMenuComponent;
  let fixture: ComponentFixture<RoomMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomMenuComponent]
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
