import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: string | null;
}

/** React Error Boundary — bitta komponent xatosi butun UI ni yiqitmasin */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(err: Error): State {
    return { error: err.message || "Kutilmagan xato" };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-screen flex-col items-center justify-center gap-3 bg-[#030303] px-6 text-center text-[#b0b0b0]">
          <p className="text-sm text-[#d45448]">Ma'lumot vaqtincha mavjud emas</p>
          <p className="max-w-md text-[11px] opacity-60">{this.state.error}</p>
          <button
            type="button"
            className="rounded border border-white/10 px-3 py-1.5 text-[11px] text-[#c9a020]"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Qayta yuklash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
