import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Einfache Login-Komponente für die Startseite
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(private auth: AuthService, private router: Router) {
    // Bereits angemeldete Nutzer direkt weiterleiten
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/zuhause']);
    }
  }

  // Versucht den Login und leitet bei Erfolg weiter
  login(): void {
    if (this.auth.login(this.username, this.password)) {
      this.router.navigate(['/zuhause']);
    } else {
      alert('Login fehlgeschlagen');
    }
  }
}
