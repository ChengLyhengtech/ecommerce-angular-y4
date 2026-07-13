import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BannerForm } from './banner-form';

describe('BannerForm', () => {
  let component: BannerForm;
  let fixture: ComponentFixture<BannerForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BannerForm],
    }).compileComponents();

    fixture = TestBed.createComponent(BannerForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
