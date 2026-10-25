using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Collections.Generic;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal static class Launcher {
    private static string ReadyAddress() {
        try {
            string configPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TreinoAppPC", "config.json");
            if (!File.Exists(configPath)) return null;
            JavaScriptSerializer json = new JavaScriptSerializer();
            Dictionary<string, object> config = json.Deserialize<Dictionary<string, object>>(File.ReadAllText(configPath));
            if (!config.ContainsKey("id") || !config.ContainsKey("desktopToken")) return null;
            string token = config["desktopToken"] as string;
            if (token == null || !System.Text.RegularExpressions.Regex.IsMatch(token, "^[A-Za-z0-9_-]{43}$")) return null;
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:43127/health");
            request.Proxy = null;
            request.Timeout = 1000;
            request.ReadWriteTimeout = 1000;
            request.AllowAutoRedirect = false;
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse()) {
                if (response.StatusCode != HttpStatusCode.OK) return null;
                using (StreamReader reader = new StreamReader(response.GetResponseStream())) {
                    Dictionary<string, object> health = json.Deserialize<Dictionary<string, object>>(reader.ReadToEnd());
                    if (!health.ContainsKey("app") || !Object.Equals(health["app"], "TreinoAppPC") || !health.ContainsKey("id") || !Object.Equals(health["id"], config["id"])) return null;
                    if (health.ContainsKey("ready") && !Object.Equals(health["ready"], true)) return null;
                }
            }
            return "http://127.0.0.1:43127/connect?open=" + DateTime.UtcNow.Ticks + "#" + token;
        } catch { return null; }
    }

    private static void OpenBrowser(string address) {
        ProcessStartInfo browser = new ProcessStartInfo(address);
        browser.UseShellExecute = true;
        browser.Verb = "open";
        Process.Start(browser);
    }

    [STAThread]
    private static void Main() {
        try {
            string folder = AppDomain.CurrentDomain.BaseDirectory;
            string runtime = Path.Combine(folder, "runtime", "node.exe");
            string server = Path.Combine(folder, "server.mjs");
            if (!File.Exists(runtime) || !File.Exists(server)) throw new Exception("Extraia o ZIP inteiro para uma pasta antes de abrir o TreinoApp-PC.exe. Mantenha as pastas runtime e web junto do programa.");
            string existing = ReadyAddress();
            if (existing != null) { OpenBrowser(existing); return; }
            ProcessStartInfo info = new ProcessStartInfo(runtime, "\"" + server + "\"");
            info.WorkingDirectory = folder;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.WindowStyle = ProcessWindowStyle.Hidden;
            Process helper = Process.Start(info);
            DateTime deadline = DateTime.UtcNow.AddSeconds(20);
            while (DateTime.UtcNow < deadline) {
                string ready = ReadyAddress();
                if (ready != null) { OpenBrowser(ready); return; }
                if (helper != null && helper.HasExited && helper.ExitCode != 0) break;
                Thread.Sleep(250);
            }
            string log = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TreinoAppPC", "erro.log");
            throw new Exception("Não foi possível iniciar o servidor local. Verifique se as portas 43127 e 43128 estão disponíveis. Detalhes em: " + log);
        } catch (Exception error) {
            MessageBox.Show(error.Message, "TreinoApp PC", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
