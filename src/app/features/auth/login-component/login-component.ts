import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
// Reuse header component from '/raub1' to keep visual consistency
import { HeaderComponent } from '../../../shared/components/header/header.component';

/**
 * Login form presented at the root route. Redirects to '/zuhause' on success.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  // Include header so the login page matches '/raub1' styling
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderComponent],
  templateUrl: './login-component.html',
  styleUrl: './login-component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  // Build a simple reactive form for credentials
  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  error = '';

  /**
   * On submit we validate credentials and navigate to '/zuhause'.
   */
  submit(): void {
    const { username, password } = this.form.value;
    if (this.auth.login(username ?? '', password ?? '')) {
      this.router.navigate(['/zuhause']);
    } else {
      this.error = 'Ungültige Zugangsdaten';
    }
  }

  /**
   * If already logged in, skip the form and go to '/zuhause'.
   */
  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/zuhause']);
    }
  }
}
