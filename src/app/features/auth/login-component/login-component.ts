import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

/**
 * Login-Formular unter '/login'. Erfolgreiche Anmeldung führt zur Startseite.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatLabel, MatInput, MatLabel, MatFormField],
  templateUrl: './login-component.html',
  styleUrl: './login-component.scss'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Build a simple reactive form for credentials
  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  error = '';
  public nameCtrl = new FormControl();
  public pwdCtrl = new FormControl();


  /**
   * Validiert die Eingaben und wechselt bei Erfolg zur Startseite '/'.
   */
  submit(): void {
    const { username, password } = this.form.value;
    if (this.auth.login(username ?? '', password ?? '')) {
      this.router.navigate(['/']).then();
    } else {
      this.error = 'Ungültige Zugangsdaten';
    }
  }

  /**
   * Ist der Nutzer bereits angemeldet, wird direkt zur Startseite navigiert.
   */
  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/']).then();
    } else {
      const users = localStorage.getItem('users');
      if (users) {
        const parsedUsers = JSON.parse(users);
        const username = parsedUsers[0]?.username ?? '';
        const password = parsedUsers[0]?.password ?? '';

        console.log('Username:', username);
        console.log('Password:', password);
        this.form.patchValue({
          username: username,
          password: password
        });
      }
    }
  }
}
