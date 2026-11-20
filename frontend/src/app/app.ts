import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ToastHostComponent } from './shared/components/toast-host.component';

@Component({
  imports: [RouterOutlet, ToastHostComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private auth = inject(AuthService);

  ngOnInit() {
    // Refresh the cached profile so role/company changes are picked up.
    if (this.auth.token()) this.auth.loadMe();
  }
}
