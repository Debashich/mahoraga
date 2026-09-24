#include "LinuxProvider.hpp"

#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

std::vector<std::string> splitLines(const std::string& content) {
    std::vector<std::string> lines;
    std::stringstream stream(content);
    std::string line;

    while (std::getline(stream, line)) {
        if (!line.empty()) {
            lines.push_back(line);
        }
    }

    return lines;
}

} // namespace

bool LinuxProvider::supports(const std::string& operation) const {
    return operation == "process_list" ||
           operation == "system_info" ||
           operation == "users" ||
           operation == "network_connections" ||
           operation == "auth_logs";
}

std::vector<std::string> LinuxProvider::capabilities() const {
    return {
        "process_list",
        "system_info",
        "users",
        "network_connections",
        "auth_logs"
    };
}

nlohmann::json LinuxProvider::execute(const std::string& operation) {
    if (operation == "process_list") {
        return collect_process_list();
    }

    if (operation == "system_info") {
        return collect_system_info();
    }

    if (operation == "users") {
        return collect_users();
    }

    if (operation == "network_connections") {
        return collect_network_connections();
    }

    if (operation == "auth_logs") {
        return collect_auth_logs();
    }

    throw std::runtime_error(
        "Unsupported operation: " + operation
    );
}

nlohmann::json LinuxProvider::collect_process_list() {
    nlohmann::json processes = nlohmann::json::array();

    std::ifstream proc("/proc");

    if (!proc.is_open()) {
        return {
            {"error", "Unable to access /proc"}
        };
    }

    // Read process information directly from /proc.
    // Detailed process enumeration can be expanded here.
    proc.close();

    return {
        {"collector", "linux_proc"},
        {"processes", processes}
    };
}

nlohmann::json LinuxProvider::collect_system_info() {
    nlohmann::json result;

    std::ifstream osRelease("/etc/os-release");

    if (osRelease.is_open()) {
        std::string line;

        while (std::getline(osRelease, line)) {
            if (line.rfind("PRETTY_NAME=", 0) == 0) {
                std::string os = line.substr(12);

                if (os.size() >= 2 &&
                    os.front() == '"' &&
                    os.back() == '"') {
                    os = os.substr(1, os.size() - 2);
                }

                result["os"] = os;
            }
        }
    }

    std::ifstream hostname("/etc/hostname");

    if (hostname.is_open()) {
        std::string name;
        std::getline(hostname, name);

        if (!name.empty()) {
            result["hostname"] = name;
        }
    }

    return result;
}

nlohmann::json LinuxProvider::collect_users() {
    nlohmann::json users = nlohmann::json::array();

    std::ifstream passwd("/etc/passwd");

    if (!passwd.is_open()) {
        return {
            {"error", "Unable to read /etc/passwd"}
        };
    }

    std::string line;

    while (std::getline(passwd, line)) {
        if (!line.empty()) {
            users.push_back(line);
        }
    }

    return {
        {"users", users}
    };
}

nlohmann::json LinuxProvider::collect_network_connections() {
    nlohmann::json connections = nlohmann::json::array();

    const std::vector<std::string> files = {
        "/proc/net/tcp",
        "/proc/net/tcp6",
        "/proc/net/udp",
        "/proc/net/udp6"
    };

    for (const auto& file : files) {
        std::ifstream input(file);

        if (!input.is_open()) {
            continue;
        }

        std::string line;
        bool firstLine = true;

        while (std::getline(input, line)) {
            if (firstLine) {
                firstLine = false;
                continue;
            }

            if (!line.empty()) {
                connections.push_back({
                    {"source", file},
                    {"raw", line}
                });
            }
        }
    }

    return {
        {"connections", connections}
    };
}

nlohmann::json LinuxProvider::collect_auth_logs() {
    nlohmann::json logs = nlohmann::json::array();

    const std::vector<std::string> files = {
        "/var/log/auth.log",
        "/var/log/secure"
    };

    for (const auto& file : files) {
        std::ifstream input(file);

        if (!input.is_open()) {
            continue;
        }

        std::string line;

        while (std::getline(input, line)) {
            if (!line.empty()) {
                logs.push_back({
                    {"source", file},
                    {"raw", line}
                });
            }
        }
    }

    return {
        {"logs", logs}
    };
}