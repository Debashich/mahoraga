#include "LinuxProvider.hpp"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <algorithm>

namespace fs = std::filesystem;

bool LinuxProvider::supports(const std::string& operation) const {
    return operation == "process_list" || operation == "network_connections";
}

std::vector<std::string> LinuxProvider::capabilities() const {
    return {"ProcessRead", "NetworkRead"};
}

nlohmann::json LinuxProvider::execute(const std::string& operation) {
    if (operation == "process_list") return collectProcessList();
    if (operation == "network_connections") return collectNetworkConnections();
    return nlohmann::json();
}

nlohmann::json LinuxProvider::collectProcessList() {
    nlohmann::json processes = nlohmann::json::array();
    for (const auto& entry : fs::directory_iterator("/proc")) {
        if (entry.is_directory()) {
            std::string filename = entry.path().filename().string();
            if (std::all_of(filename.begin(), filename.end(), ::isdigit)) {
                std::ifstream cmdline(entry.path() / "cmdline");
                std::string cmd;
                if (cmdline >> cmd) {
                    processes.push_back({{"pid", filename}, {"cmd", cmd}});
                } else {
                    processes.push_back({{"pid", filename}, {"cmd", "[kernel/system]"}});
                }
            }
        }
    }
    return processes;
}

nlohmann::json LinuxProvider::collectNetworkConnections() {
    nlohmann::json nets = nlohmann::json::array();
    std::ifstream tcp_file("/proc/net/tcp");
    std::string line;
    // Skip header
    if (std::getline(tcp_file, line)) {
        while (std::getline(tcp_file, line)) {
            if (!line.empty()) {
                nets.push_back({{"raw_entry", line}});
            }
        }
    }
    return nets;
}