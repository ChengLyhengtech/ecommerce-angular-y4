import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-banner-form',
  imports: [RouterLink],
  templateUrl: './banner-form.html',
  styleUrl: './banner-form.css',
})
export class BannerFormComponent {
  xPos = 10;
  yPos = 20;
  bannerTitle = '';
  
  updateX(event: Event) {
    this.xPos = Number((event.target as HTMLInputElement).value);
  }
  
  updateY(event: Event) {
    this.yPos = Number((event.target as HTMLInputElement).value);
  }
}
