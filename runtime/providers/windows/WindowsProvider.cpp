#ifdef _WIN32
#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0601
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <iphlpapi.h>
#include <tlhelp32.h>
#include <lm.h>
#include <psapi.h>
#include <winreg.h>

#ifndef PROCESSOR_ARCHITECTURE_ARM64
#define PROCESSOR_ARCHITECTURE_ARM64 12
#endif
#endif

#include "WindowsProvider.hpp"
#include <iostream>
#include <stdexcept>
#include <cstdio>
#include <cstdlib>

bool WindowsProvider::supports(const std::string& operation) const {
    return operation == "process_list" ||
           operation == "network_connections" ||
           operation == "system_info" ||
           operation == "users" ||
           operation == "auth_logs" ||
           operation == "file_metadata" ||
           operation == "driver_scan" ||
           operation == "registry_hives";
}

std::vector<std::string> WindowsProvider::capabilities() const {
    return {
        "process_list",
        "network_connections",
        "system_info",
        "users",
        "auth_logs",
        "file_metadata",
        "driver_scan",
        "registry_hives"
    };
}

nlohmann::json WindowsProvider::execute(const std::string& operation) {
    if (operation == "process_list") return collect_process_list();
    if (operation == "network_connections") return collect_network_connections();
    if (operation == "system_info") return collect_system_info();
    if (operation == "users") return collect_users();
    if (operation == "auth_logs") return collect_auth_logs();
    if (operation == "file_metadata") return collect_file_metadata();
    if (operation == "driver_scan") return collect_driver_scan();
    if (operation == "registry_hives") return collect_registry_hives();
    throw std::runtime_error("Unsupported operation: " + operation);
}

nlohmann::json WindowsProvider::collect_process_list() {
    nlohmann::json processes = nlohmann::json::array();
#ifdef _WIN32
    HANDLE hProcessSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hProcessSnap != INVALID_HANDLE_VALUE) {
        PROCESSENTRY32 pe32;
        pe32.dwSize = sizeof(PROCESSENTRY32);
        if (Process32First(hProcessSnap, &pe32)) {
            do {
                std::string exeName = pe32.szExeFile;
                processes.push_back({
                    {"pid", std::to_string(pe32.th32ProcessID)},
                    {"command", exeName},
                    {"cmd", exeName}
                });
            } while (Process32Next(hProcessSnap, &pe32));
        }
        CloseHandle(hProcessSnap);
    }
    return {
        {"collector", "windows_native"},
        {"processes", processes}
    };
#else
    processes.push_back({{"error", "Windows provider executed on non-Windows host"}});
    return {
        {"collector", "windows_native"},
        {"processes", processes}
    };
#endif
}

nlohmann::json WindowsProvider::collect_network_connections() {
    nlohmann::json connections = nlohmann::json::array();
#ifdef _WIN32
    typedef DWORD (WINAPI *pfnGetExtendedTcpTable)(
        PVOID pTcpTable,
        PDWORD pdwSize,
        BOOL bOrder,
        ULONG ulAf,
        TCP_TABLE_CLASS TableClass,
        ULONG Reserved
    );

    pfnGetExtendedTcpTable pGetExtendedTcpTable = (pfnGetExtendedTcpTable)GetProcAddress(
        GetModuleHandleA("iphlpapi.dll"), "GetExtendedTcpTable"
    );
    if (!pGetExtendedTcpTable) {
        HMODULE hLib = LoadLibraryA("iphlpapi.dll");
        if (hLib) {
            pGetExtendedTcpTable = (pfnGetExtendedTcpTable)GetProcAddress(hLib, "GetExtendedTcpTable");
        }
    }

    if (pGetExtendedTcpTable) {
        PMIB_TCPTABLE_OWNER_PID pTcpTable = nullptr;
        DWORD dwSize = 0;
        DWORD dwRetVal = pGetExtendedTcpTable(
            nullptr,
            &dwSize,
            TRUE,
            AF_INET,
            TCP_TABLE_OWNER_PID_ALL,
            0
        );

        if (dwRetVal == ERROR_INSUFFICIENT_BUFFER) {
            pTcpTable = reinterpret_cast<PMIB_TCPTABLE_OWNER_PID>(malloc(dwSize));
            if (pTcpTable != nullptr) {
                dwRetVal = pGetExtendedTcpTable(
                    pTcpTable,
                    &dwSize,
                    TRUE,
                    AF_INET,
                    TCP_TABLE_OWNER_PID_ALL,
                    0
                );

                if (dwRetVal == NO_ERROR) {
                    for (DWORD i = 0; i < pTcpTable->dwNumEntries; ++i) {
                        const auto& row = pTcpTable->table[i];
                        char localIp[64];
                        snprintf(localIp, sizeof(localIp), "%u.%u.%u.%u",
                            (row.dwLocalAddr) & 0xFF,
                            (row.dwLocalAddr >> 8) & 0xFF,
                            (row.dwLocalAddr >> 16) & 0xFF,
                            (row.dwLocalAddr >> 24) & 0xFF);

                        char remoteIp[64];
                        snprintf(remoteIp, sizeof(remoteIp), "%u.%u.%u.%u",
                            (row.dwRemoteAddr) & 0xFF,
                            (row.dwRemoteAddr >> 8) & 0xFF,
                            (row.dwRemoteAddr >> 16) & 0xFF,
                            (row.dwRemoteAddr >> 24) & 0xFF);

                        uint16_t localPort = ntohs(static_cast<uint16_t>(row.dwLocalPort));
                        uint16_t remotePort = ntohs(static_cast<uint16_t>(row.dwRemotePort));

                        std::string stateStr = "UNKNOWN";
                        switch (row.dwState) {
                            case MIB_TCP_STATE_CLOSED: stateStr = "CLOSED"; break;
                            case MIB_TCP_STATE_LISTEN: stateStr = "LISTEN"; break;
                            case MIB_TCP_STATE_SYN_SENT: stateStr = "SYN_SENT"; break;
                            case MIB_TCP_STATE_SYN_RCVD: stateStr = "SYN_RCVD"; break;
                            case MIB_TCP_STATE_ESTAB: stateStr = "ESTABLISHED"; break;
                            case MIB_TCP_STATE_FIN_WAIT1: stateStr = "FIN_WAIT1"; break;
                            case MIB_TCP_STATE_FIN_WAIT2: stateStr = "FIN_WAIT2"; break;
                            case MIB_TCP_STATE_CLOSE_WAIT: stateStr = "CLOSE_WAIT"; break;
                            case MIB_TCP_STATE_CLOSING: stateStr = "CLOSING"; break;
                            case MIB_TCP_STATE_LAST_ACK: stateStr = "LAST_ACK"; break;
                            case MIB_TCP_STATE_TIME_WAIT: stateStr = "TIME_WAIT"; break;
                            case MIB_TCP_STATE_DELETE_TCB: stateStr = "DELETE_TCB"; break;
                        }

                        std::string rawEntry = std::string(localIp) + ":" + std::to_string(localPort) +
                                               " -> " + std::string(remoteIp) + ":" + std::to_string(remotePort) +
                                               " [" + stateStr + "] PID=" + std::to_string(row.dwOwningPid);

                        connections.push_back({
                            {"pid", std::to_string(row.dwOwningPid)},
                            {"local_address", std::string(localIp) + ":" + std::to_string(localPort)},
                            {"local_ip", std::string(localIp)},
                            {"local_port", localPort},
                            {"remote_address", std::string(remoteIp) + ":" + std::to_string(remotePort)},
                            {"remote_ip", std::string(remoteIp)},
                            {"remote_port", remotePort},
                            {"state", stateStr},
                            {"raw", rawEntry},
                            {"raw_entry", rawEntry}
                        });
                    }
                }
                free(pTcpTable);
            }
        }
    }
    return {
        {"collector", "windows_iphlpapi"},
        {"connections", connections}
    };
#else
    connections.push_back({{"error", "Windows provider executed on non-Windows host"}});
    return {
        {"collector", "windows_iphlpapi"},
        {"connections", connections}
    };
#endif
}

nlohmann::json WindowsProvider::collect_system_info() {
    nlohmann::json result;
#ifdef _WIN32
    SYSTEM_INFO si;
    typedef void (WINAPI *pfnGetNativeSystemInfo)(LPSYSTEM_INFO lpSystemInfo);
    pfnGetNativeSystemInfo pGetNativeSystemInfo = (pfnGetNativeSystemInfo)GetProcAddress(
        GetModuleHandleA("kernel32.dll"), "GetNativeSystemInfo"
    );
    if (pGetNativeSystemInfo) {
        pGetNativeSystemInfo(&si);
    } else {
        GetSystemInfo(&si);
    }

    std::string arch = "unknown";
    if (si.wProcessorArchitecture == PROCESSOR_ARCHITECTURE_AMD64) {
        arch = "x86_64";
    } else if (si.wProcessorArchitecture == PROCESSOR_ARCHITECTURE_INTEL) {
        arch = "x86";
    } else if (si.wProcessorArchitecture == PROCESSOR_ARCHITECTURE_ARM64) {
        arch = "arm64";
    } else if (si.wProcessorArchitecture == PROCESSOR_ARCHITECTURE_ARM) {
        arch = "arm";
    }

    char compName[MAX_COMPUTERNAME_LENGTH + 1] = {0};
    DWORD nameLen = sizeof(compName);
    std::string hostname = "unknown";
    if (GetComputerNameA(compName, &nameLen) && nameLen > 0) {
        hostname = std::string(compName, nameLen);
    }

    result["os"] = "Windows";
    result["platform"] = "windows";
    result["hostname"] = hostname;
    result["architecture"] = arch;
    result["num_processors"] = si.dwNumberOfProcessors;
    result["page_size"] = si.dwPageSize;
#else
    result["error"] = "Windows provider executed on non-Windows host";
#endif
    return result;
}

nlohmann::json WindowsProvider::collect_users() {
    nlohmann::json users = nlohmann::json::array();
#ifdef _WIN32
    PNET_DISPLAY_USER pBuff = nullptr;
    DWORD dwRec = 0;
    DWORD dwRes = NetQueryDisplayInformation(nullptr, 1, 0, 100, MAX_PREFERRED_LENGTH, &dwRec, (PVOID*)&pBuff);
    if (dwRes == NERR_Success || dwRes == ERROR_MORE_DATA) {
        for (DWORD i = 0; i < dwRec; i++) {
            std::wstring wname(pBuff[i].usri1_name);
            std::string name(wname.begin(), wname.end());
            users.push_back({
                {"username", name},
                {"user_id", std::to_string(pBuff[i].usri1_user_id)},
                {"flags", pBuff[i].usri1_flags},
                {"raw", name}
            });
        }
        NetApiBufferFree(pBuff);
    } else {
        char currentUsername[256] = {0};
        DWORD size = sizeof(currentUsername);
        if (GetUserNameA(currentUsername, &size)) {
            users.push_back({
                {"username", std::string(currentUsername)},
                {"raw", std::string(currentUsername)}
            });
        }
    }
#else
    users.push_back({{"error", "Windows provider executed on non-Windows host"}});
#endif
    return {
        {"collector", "windows_netapi32"},
        {"users", users}
    };
}

nlohmann::json WindowsProvider::collect_auth_logs() {
    nlohmann::json logs = nlohmann::json::array();
#ifdef _WIN32
    const char* sources[] = {"System", "Application", "Security"};
    for (const char* sourceName : sources) {
        HANDLE hLog = OpenEventLogA(nullptr, sourceName);
        if (hLog) {
            DWORD dwRead = 0, dwNeeded = 0;
            BYTE buffer[4096];
            if (ReadEventLogA(hLog, EVENTLOG_BACKWARDS_READ | EVENTLOG_SEQUENTIAL_READ, 0, buffer, sizeof(buffer), &dwRead, &dwNeeded)) {
                DWORD bytesRead = 0;
                while (bytesRead < dwRead) {
                    PEVENTLOGRECORD pRecord = (PEVENTLOGRECORD)&buffer[bytesRead];
                    std::string providerName = (char*)((LPBYTE)pRecord + sizeof(EVENTLOGRECORD));
                    std::string entry = "Source: " + providerName +
                                        " EventID: " + std::to_string(pRecord->EventID & 0xFFFF) +
                                        " Time: " + std::to_string(pRecord->TimeGenerated);
                    logs.push_back({
                        {"source", sourceName},
                        {"event_id", pRecord->EventID & 0xFFFF},
                        {"provider", providerName},
                        {"timestamp", pRecord->TimeGenerated},
                        {"raw", entry}
                    });
                    bytesRead += pRecord->Length;
                }
            }
            CloseEventLog(hLog);
        }
    }
#else
    logs.push_back({{"error", "Windows provider executed on non-Windows host"}});
#endif
    return {
        {"collector", "windows_eventlog"},
        {"logs", logs}
    };
}

nlohmann::json WindowsProvider::collect_file_metadata() {
    nlohmann::json files = nlohmann::json::array();
#ifdef _WIN32
    char sysDir[MAX_PATH] = {0};
    if (GetSystemDirectoryA(sysDir, sizeof(sysDir)) > 0) {
        std::string searchPattern = std::string(sysDir) + "\\*.exe";
        WIN32_FIND_DATAA findData;
        HANDLE hFind = FindFirstFileA(searchPattern.c_str(), &findData);
        if (hFind != INVALID_HANDLE_VALUE) {
            int count = 0;
            do {
                if (!(findData.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) {
                    uint64_t fileSize = (static_cast<uint64_t>(findData.nFileSizeHigh) << 32) | findData.nFileSizeLow;
                    std::string fullPath = std::string(sysDir) + "\\" + findData.cFileName;
                    files.push_back({
                        {"path", fullPath},
                        {"filename", std::string(findData.cFileName)},
                        {"size", fileSize},
                        {"attributes", findData.dwFileAttributes},
                        {"raw", fullPath + " (" + std::to_string(fileSize) + " bytes)"}
                    });
                    if (++count >= 25) break;
                }
            } while (FindNextFileA(hFind, &findData));
            FindClose(hFind);
        }
    }
#else
    files.push_back({{"error", "Windows provider executed on non-Windows host"}});
#endif
    return {
        {"collector", "windows_filesystem"},
        {"files", files}
    };
}

nlohmann::json WindowsProvider::collect_driver_scan() {
    nlohmann::json drivers = nlohmann::json::array();
#ifdef _WIN32
    LPVOID driversBuffer[1024];
    DWORD cbNeeded = 0;
    if (EnumDeviceDrivers(driversBuffer, sizeof(driversBuffer), &cbNeeded) && cbNeeded > 0) {
        int cDrivers = cbNeeded / sizeof(LPVOID);
        for (int i = 0; i < cDrivers && i < 50; i++) {
            char szDriver[MAX_PATH] = {0};
            if (GetDeviceDriverBaseNameA(driversBuffer[i], szDriver, sizeof(szDriver))) {
                uint64_t baseAddr = reinterpret_cast<uint64_t>(driversBuffer[i]);
                char addrHex[64];
                snprintf(addrHex, sizeof(addrHex), "0x%llx", (unsigned long long)baseAddr);
                drivers.push_back({
                    {"name", std::string(szDriver)},
                    {"base_address", std::string(addrHex)},
                    {"raw", std::string(szDriver) + " @ " + std::string(addrHex)}
                });
            }
        }
    }
#else
    drivers.push_back({{"error", "Windows provider executed on non-Windows host"}});
#endif
    return {
        {"collector", "windows_psapi"},
        {"drivers", drivers}
    };
}

nlohmann::json WindowsProvider::collect_registry_hives() {
    nlohmann::json registry = nlohmann::json::array();
#ifdef _WIN32
    HKEY hKey;
    if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion", 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        char valueName[256];
        DWORD dwValueNameLen = sizeof(valueName);
        DWORD dwType = 0;
        BYTE data[512];
        DWORD dwDataLen = sizeof(data);
        DWORD index = 0;
        while (RegEnumValueA(hKey, index++, valueName, &dwValueNameLen, nullptr, &dwType, data, &dwDataLen) == ERROR_SUCCESS) {
            std::string valStr = "";
            if (dwType == REG_SZ || dwType == REG_EXPAND_SZ) {
                valStr = std::string((char*)data, strnlen((char*)data, dwDataLen));
            } else if (dwType == REG_DWORD && dwDataLen >= sizeof(DWORD)) {
                valStr = std::to_string(*(DWORD*)data);
            }
            registry.push_back({
                {"hive", "HKLM"},
                {"key", "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion"},
                {"name", std::string(valueName)},
                {"type", dwType},
                {"value", valStr},
                {"raw", std::string(valueName) + " = " + valStr}
            });
            dwValueNameLen = sizeof(valueName);
            dwDataLen = sizeof(data);
            if (index >= 30) break;
        }
        RegCloseKey(hKey);
    }
#else
    registry.push_back({{"error", "Windows provider executed on non-Windows host"}});
#endif
    return {
        {"collector", "windows_registry"},
        {"registry", registry}
    };
}