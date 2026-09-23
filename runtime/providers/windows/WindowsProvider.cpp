#include "WindowsProvider.hpp"

#ifdef _WIN32
#include <windows.h>
#include <tlhelp32.h>
#endif

bool WindowsProvider::supports(const std::string& operation) const {
    return operation == "process_list" || operation == "network_connections";
}

std::vector<std::string> WindowsProvider::capabilities() const {
    return {"ProcessRead", "NetworkRead"};
}

nlohmann::json WindowsProvider::execute(const std::string& operation) {
    if (operation == "process_list") return collectProcessList();
    if (operation == "network_connections") return collectNetworkConnections();
    return nlohmann::json();
}

nlohmann::json WindowsProvider::collectProcessList() {
    nlohmann::json processes = nlohmann::json::array();
#ifdef _WIN32
    HANDLE hProcessSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hProcessSnap != INVALID_HANDLE_VALUE) {
        PROCESSENTRY32 pe32;
        pe32.dwSize = sizeof(PROCESSENTRY32);
        if (Process32First(hProcessSnap, &pe32)) {
            do {
                processes.push_back({
                    {"pid", std::to_string(pe32.th32ProcessID)},
                    {"cmd", pe32.szExeFile}
                });
            } while (Process32Next(hProcessSnap, &pe32));
        }
        CloseHandle(hProcessSnap);
    }
#else
    processes.push_back({{"error", "Windows provider executed on non-Windows host"}});
#endif
    return processes;
}

nlohmann::json WindowsProvider::collectNetworkConnections() {
    return nlohmann::json::array(); // Stub for Windows ETW/IPHelper API
}