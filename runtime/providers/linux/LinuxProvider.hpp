#pragma once

#include "../common/Provider.hpp"
#include <nlohmann/json.hpp>

class LinuxProvider : public Provider {
public:
    bool supports(const std::string& operation) const override;

    std::vector<std::string> capabilities() const override;

    nlohmann::json execute(const std::string& operation) override;

private:
    nlohmann::json collect_process_list();
    nlohmann::json collect_system_info();
    nlohmann::json collect_users();
    nlohmann::json collect_network_connections();
    nlohmann::json collect_auth_logs();
};