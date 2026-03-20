import { api } from '../../lib/api.js'
import { formatTime } from '../../lib/formatters.js'
import { CheckCircle, Circle, Download, Smartphone, Shield, Key, Trash2 } from 'lucide-react'

export default function SetupPage({ status }) {
  const proxy = status?.proxy
  const token = status?.token
  const localIP = status?.localIP || '...'

  const handleClearToken = async () => {
    await api.deleteToken()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Setup</h2>

      {/* Proxy Status Card */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${proxy?.running ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <h3 className="text-lg font-semibold">
            Proxy {proxy?.running ? 'Running' : 'Stopped'}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">IP Address</span>
            <p className="font-mono text-emerald-400">{localIP}</p>
          </div>
          <div>
            <span className="text-gray-500">Proxy Port</span>
            <p className="font-mono text-emerald-400">{proxy?.port || '8001'}</p>
          </div>
        </div>
      </div>

      {/* Token Status Card */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Key size={20} className={token?.hasToken ? 'text-emerald-400' : 'text-yellow-500'} />
            <h3 className="text-lg font-semibold">Access Token</h3>
          </div>
          {token?.hasToken && (
            <button
              onClick={handleClearToken}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>
        {token?.hasToken ? (
          <div className="space-y-2 text-sm">
            <p className="font-mono text-gray-300 bg-gray-800 rounded px-3 py-2 break-all">{token.masked}</p>
            <p className="text-gray-500">Captured: {formatTime(token.capturedAt)} ({token.ageMinutes} min ago)</p>
          </div>
        ) : (
          <p className="text-yellow-500 text-sm">No token captured yet. Follow the steps below.</p>
        )}
      </div>

      {/* iOS Setup Instructions */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Smartphone size={20} />
          iPhone Setup
        </h3>

        <div className="space-y-4">
          <Step n={1} done={proxy?.running}>
            <strong>Connect to same WiFi</strong>
            <p className="text-gray-400">Make sure your iPhone and Mac are on the same network.</p>
          </Step>

          <Step n={2}>
            <strong>Set HTTP Proxy on iPhone</strong>
            <p className="text-gray-400">
              Settings → Wi-Fi → tap <span className="font-mono text-xs bg-gray-800 px-1 rounded">(i)</span> → HTTP Proxy → Manual
            </p>
            <div className="mt-2 bg-gray-800 rounded-lg p-3 font-mono text-sm space-y-1">
              <p>Server: <span className="text-emerald-400">{localIP}</span></p>
              <p>Port: <span className="text-emerald-400">{proxy?.port || '8001'}</span></p>
              <p>Authentication: <span className="text-gray-400">Off</span></p>
            </div>
          </Step>

          <Step n={3}>
            <strong>Install CA Certificate</strong>
            <p className="text-gray-400">Open Safari on your iPhone and visit:</p>
            <a
              href={`http://${localIP}:${status?.proxy?.port || 3001}/api/cert`}
              className="mt-2 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg px-4 py-2 text-sm hover:bg-emerald-500/20 transition-colors"
            >
              <Download size={16} />
              http://{localIP}:3001/api/cert
            </a>
            <p className="text-gray-500 text-xs mt-1">Tap "Allow" when prompted to download the profile.</p>
          </Step>

          <Step n={4}>
            <strong>Install the Profile</strong>
            <p className="text-gray-400">
              Settings → General → VPN & Device Management → Bigmonee CA → Install
            </p>
          </Step>

          <Step n={5}>
            <strong>Trust the Certificate</strong>
            <p className="text-gray-400">
              Settings → General → About → Certificate Trust Settings → Enable "Bigmonee CA"
            </p>
          </Step>

          <Step n={6} done={token?.hasToken}>
            <strong>Open Stockbit App</strong>
            <p className="text-gray-400">
              Open the Stockbit app and browse normally. The token will be captured automatically.
            </p>
          </Step>

          <Step n={7}>
            <strong>Disable Proxy (optional)</strong>
            <p className="text-gray-400">
              Once the token is captured, you can set the proxy back to "Off" on your iPhone.
            </p>
          </Step>
        </div>
      </div>
    </div>
  )
}

function Step({ n, done, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-0.5">
        {done ? (
          <CheckCircle size={20} className="text-emerald-400" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center text-xs text-gray-500">
            {n}
          </div>
        )}
      </div>
      <div className="text-sm space-y-1">{children}</div>
    </div>
  )
}
