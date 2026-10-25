using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class Launcher {
    [STAThread]
    private static void Main() {
        try {
            string folder = AppDomain.CurrentDomain.BaseDirectory;
            string runtime = Path.Combine(folder, "runtime", "node.exe");
            string server = Path.Combine(folder, "server.mjs");
            if (!File.Exists(runtime) || !File.Exists(server)) throw new Exception("Extraia o ZIP inteiro para uma pasta antes de abrir o TreinoApp-PC.exe. Mantenha as pastas runtime e web junto do programa.");
            ProcessStartInfo info = new ProcessStartInfo(runtime, "\"" + server + "\" --open");
            info.WorkingDirectory = folder;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.WindowStyle = ProcessWindowStyle.Hidden;
            Process helper = Process.Start(info);
            if (helper != null && helper.WaitForExit(8000) && helper.ExitCode != 0) {
                string log = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TreinoAppPC", "erro.log");
                throw new Exception("Não foi possível iniciar o servidor local. Verifique se as portas 43127 e 43128 estão disponíveis. Detalhes em: " + log);
            }
        } catch (Exception error) {
            MessageBox.Show(error.Message, "TreinoApp PC", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
