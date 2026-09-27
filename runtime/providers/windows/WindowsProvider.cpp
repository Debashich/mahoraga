#include "WindowsProvider.hpp"

#include <iostream>
#include <stdexcept>
#include <cstdio>
#include <cstdlib>

#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <iphlpapi.h>
#include <tlhelp32.h>
#endif

bool WindowsProvider::supports(const std::string& operation) const {
    return operation == "process_list" ||
           operation == "network_connections" ||
           operation == "system_info";
}

std::vector<std::string> WindowsProvider::capabilities() const {
    return {"process_list", "network_connections", "system_info"};
}

nlohmann::json WindowsProvider::execute(const std::string& operation) {
    if (operation == "process_list") return collect_process_list();
    if (operation == "network_connections") return collect_network_connections();
    if (operation == "system_info") return collect_system_info();
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
    PMIB_TCPTABLE_OWNER_PID pTcpTable = nullptr;
    DWORD dwSize = 0;
    DWORD dwRetVal = GetExtendedTcpTable(
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
            dwRetVal = GetExtendedTcpTable(
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
    GetNativeSystemInfo(&si);

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